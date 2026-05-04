from fastapi import APIRouter, HTTPException, Query, Body, Depends, Request, Response
import pymongo
from app.database import (
    users_collection,
    reset_codes_collection,
    projects_collection,
    documents_collection,
    refresh_tokens_collection,
    email_verifications_collection,
)
from app.utils.security import hash_password, verify_password
from app.utils.auth import get_current_user
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    create_email_verification_token,
    hash_token,
)
from app.services.email_service import send_email
from app.schemas.auth import (
    LoginRequest,
    AuthRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ForgotPasswordRequest,
    VerifyCodeRequest,
    UserSettings,
    ResendVerificationRequest,
)
from app.config import settings
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import hashlib
import asyncio
import logging

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# ── Cookie helpers ─────────────────────────────────────────────────────────────

REFRESH_COOKIE_NAME = "lyra_refresh"
# 10 years in seconds — effectively "until logout"; the DB record is the
# real validity gate and is deleted only on explicit logout.
REFRESH_COOKIE_MAX_AGE = 10 * 365 * 24 * 3600


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/auth",   # scoped: only sent to /api/auth/* endpoints
    )


def _delete_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/api/auth",
    )


# ── Email helpers ──────────────────────────────────────────────────────────────

def _verification_email_html(name: str, link: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:#1a1a1a;">Welcome to Lyra, {name}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <a href="{link}"
         style="display:inline-block;margin:16px 0;padding:12px 28px;
                background:#6c63ff;color:#fff;border-radius:8px;
                text-decoration:none;font-weight:600;">
        Verify Email
      </a>
      <p style="color:#666;font-size:13px;">
        This link expires in 24 hours. If you didn't create a Lyra account, ignore this email.
      </p>
      <p style="color:#aaa;font-size:12px;">Or paste this link into your browser:<br>{link}</p>
    </div>
    """


# ── Register ───────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(data: RegisterRequest):
    try:
        if await users_collection.find_one({"email": data.email.lower()}):
            raise HTTPException(400, "Email already registered. Please log in.")

        hashed_pw = hash_password(data.password)
        user = {
            "name": data.name,
            "email": data.email.lower(),
            "password_hash": hashed_pw,
            "email_verified": False,
            "created_at": datetime.utcnow(),
            "settings": UserSettings().model_dump(),
        }
        result = await users_collection.insert_one(user)
        user_id = result.inserted_id

        # Create email verification token
        raw_token, hashed = create_email_verification_token()
        await email_verifications_collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "token_hash": hashed,
                    "expires_at": datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFY_EXPIRE_HOURS),
                }
            },
            upsert=True,
        )

        verify_link = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
        await asyncio.to_thread(
            send_email,
            to_email=data.email,
            subject="Lyra — Verify your email",
            html_body=_verification_email_html(data.name, verify_link),
            text_body=f"Verify your Lyra account: {verify_link}",
        )

        return {
            "message": "Account created! Please check your email to verify your account.",
            "needs_verification": True,
        }

    except pymongo.errors.DuplicateKeyError:
        raise HTTPException(400, "Email already registered. Please use a different email or log in.")


# ── Login ──────────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(data: LoginRequest, response: Response):
    user = await users_collection.find_one({"email": data.email.lower()})

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("email_verified", False):
        raise HTTPException(status_code=403, detail="email_not_verified")

    access_token = create_access_token(str(user["_id"]))

    if data.remember_me:
        raw_rt, hashed_rt = create_refresh_token()
        await refresh_tokens_collection.insert_one({
            "token_hash": hashed_rt,
            "user_id": user["_id"],
            "created_at": datetime.utcnow(),
            # No expires_at — token is valid until the user explicitly logs out
        })
        _set_refresh_cookie(response, raw_rt)

    return {"access_token": access_token}


# ── Refresh ────────────────────────────────────────────────────────────────────

@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    token_hash = hash_token(raw_token)
    record = await refresh_tokens_collection.find_one({"token_hash": token_hash})

    if not record:
        # Token not found — possible reuse after rotation; clear cookie
        _delete_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Rotate: delete old token, issue new one (no expiry — valid until logout)
    await refresh_tokens_collection.delete_one({"_id": record["_id"]})
    new_raw, new_hashed = create_refresh_token()
    await refresh_tokens_collection.insert_one({
        "token_hash": new_hashed,
        "user_id": record["user_id"],
        "created_at": datetime.utcnow(),
    })
    _set_refresh_cookie(response, new_raw)

    access_token = create_access_token(str(record["user_id"]))
    return {"access_token": access_token}


# ── Logout ─────────────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(request: Request, response: Response):
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        token_hash = hash_token(raw_token)
        await refresh_tokens_collection.delete_one({"token_hash": token_hash})
    _delete_refresh_cookie(response)
    return {"message": "Logged out"}


# ── Email verification ─────────────────────────────────────────────────────────

@router.get("/verify-email")
async def verify_email(token: str = Query(...)):
    token_hash = hash_token(token)
    record = await email_verifications_collection.find_one({"token_hash": token_hash})

    if not record:
        raise HTTPException(400, "Invalid or expired verification link")

    if record["expires_at"] < datetime.utcnow():
        await email_verifications_collection.delete_one({"_id": record["_id"]})
        raise HTTPException(400, "Verification link expired. Please request a new one.")

    await users_collection.update_one(
        {"_id": record["user_id"]},
        {"$set": {"email_verified": True}},
    )
    await email_verifications_collection.delete_one({"_id": record["_id"]})

    return {"message": "Email verified successfully. You can now log in."}


# ── Resend verification ────────────────────────────────────────────────────────

@router.post("/resend-verification")
async def resend_verification(data: ResendVerificationRequest):
    user = await users_collection.find_one({"email": data.email.lower()})
    # Always return success to avoid email enumeration
    if not user or user.get("email_verified", False):
        return {"message": "If an unverified account exists, a new link has been sent."}

    raw_token, hashed = create_email_verification_token()
    await email_verifications_collection.update_one(
        {"user_id": user["_id"]},
        {
            "$set": {
                "token_hash": hashed,
                "expires_at": datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFY_EXPIRE_HOURS),
            }
        },
        upsert=True,
    )

    verify_link = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
    await asyncio.to_thread(
        send_email,
        to_email=data.email,
        subject="Lyra — Verify your email",
        html_body=_verification_email_html(user.get("name", "there"), verify_link),
        text_body=f"Verify your Lyra account: {verify_link}",
    )

    return {"message": "If an unverified account exists, a new link has been sent."}


# ── Password reset ─────────────────────────────────────────────────────────────

@router.get("/check-email")
async def check_email(email: str = Query(...)):
    return {"exists": False}


@router.post("/forgot-password")
async def forgot_password(email: str = Body(..., embed=True)):
    user = await users_collection.find_one({"email": email.lower()})
    if not user:
        return {"message": "If an account exists, a reset code has been sent."}

    code = secrets.randbelow(1000000)
    code_str = f"{code:06d}"
    hashed_code = hashlib.sha256(code_str.encode()).hexdigest()

    await reset_codes_collection.update_one(
        {"user_id": user["_id"]},
        {
            "$set": {
                "hashed_code": hashed_code,
                "expires_at": datetime.utcnow() + timedelta(minutes=15),
                "used": False,
            }
        },
        upsert=True,
    )

    html = f"""
    <h2>Password Reset Request</h2>
    <p>Use this code to reset your password:</p>
    <h1 style="letter-spacing:8px;font-size:32px;">{code_str}</h1>
    <p>This code expires in 15 minutes.</p>
    <p>If you didn't request this, ignore this email.</p>
    """
    await asyncio.to_thread(
        send_email,
        to_email=email,
        subject="Lyra — Password Reset Code",
        html_body=html,
        text_body=f"Your reset code is: {code_str} (expires in 15 min)",
    )

    return {"message": "If an account exists, a reset code has been sent."}


@router.post("/verify-code")
async def verify_code(data: VerifyCodeRequest):
    user = await users_collection.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(400, "Invalid or expired code")

    reset_entry = await reset_codes_collection.find_one({
        "user_id": user["_id"],
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()},
    })
    if not reset_entry:
        raise HTTPException(400, "Invalid or expired code")

    hashed_input = hashlib.sha256(data.code.encode()).hexdigest()
    if hashed_input != reset_entry["hashed_code"]:
        raise HTTPException(400, "Invalid or expired code")

    return {"valid": True}


@router.post("/reset-password")
async def reset_password(data: dict = Body(...)):
    email = data.get("email")
    code = data.get("code")
    new_password = data.get("new_password")

    if not all([email, code, new_password]):
        raise HTTPException(400, "Missing required fields")

    user = await users_collection.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(404, "User not found")

    reset_entry = await reset_codes_collection.find_one({"user_id": user["_id"]})
    if not reset_entry:
        raise HTTPException(400, "No reset code found")
    if reset_entry["used"]:
        raise HTTPException(400, "Code already used")
    if datetime.utcnow() > reset_entry["expires_at"]:
        raise HTTPException(400, "Code expired")

    hashed_input = hashlib.sha256(code.encode()).hexdigest()
    if hashed_input != reset_entry["hashed_code"]:
        raise HTTPException(400, "Invalid code")

    hashed_pw = hash_password(new_password)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hashed_pw}},
    )
    await reset_codes_collection.update_one(
        {"_id": reset_entry["_id"]},
        {"$set": {"used": True}},
    )

    return {"message": "Password reset successfully. Please log in."}


# ── Account management ─────────────────────────────────────────────────────────

@router.delete("/delete-account")
async def delete_account(request: Request, response: Response, user_id=Depends(get_current_user)):
    try:
        user_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await users_collection.find_one({"_id": user_oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    projects = await projects_collection.find({"user_id": user_oid}).to_list(None)
    project_ids = [p["_id"] for p in projects]

    if project_ids:
        await documents_collection.delete_many({"project_id": {"$in": project_ids}})

    await projects_collection.delete_many({"user_id": user_oid})
    await reset_codes_collection.delete_many({"user_id": user_oid})
    await refresh_tokens_collection.delete_many({"user_id": user_oid})
    await email_verifications_collection.delete_many({"user_id": user_oid})
    await users_collection.delete_one({"_id": user_oid})

    # Revoke any refresh token cookie
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        _delete_refresh_cookie(response)

    return None


@router.get("/users/me")
async def get_current_user_info(user_id=Depends(get_current_user)):
    try:
        user_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await users_collection.find_one({"_id": user_oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "_id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "settings": user.get("settings", UserSettings().model_dump()),
    }


@router.patch("/users/me/settings")
async def update_user_settings(user_id=Depends(get_current_user), settings_body: UserSettings = Body(...)):
    try:
        user_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await users_collection.find_one({"_id": user_oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await users_collection.update_one(
        {"_id": user_oid},
        {"$set": {"settings": settings_body.model_dump()}},
    )

    return {"_id": str(user["_id"]), "settings": settings_body.model_dump()}
