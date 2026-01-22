from fastapi import APIRouter, HTTPException
from app.database import users_collection, reset_codes_collection
from app.utils.security import hash_password, verify_password
from app.services.auth_service import create_access_token, send_email
from app.schemas.auth import AuthRequest
from app.schemas.auth import RegisterRequest
from app.schemas.auth import ResetPasswordRequest
from app.schemas.auth import ForgotPasswordRequest
from app.schemas.auth import VerifyCodeRequest
from fastapi import Query
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Body
from app.services.email_service import send_email
from app.database import reset_codes_collection, users_collection
from datetime import datetime, timedelta
import secrets
import hashlib

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(data: RegisterRequest):
    if await users_collection.find_one({"email": data.email.lower()}):
        raise HTTPException(400, "Email already registered. Please log in.")
    
    hashed_pw = hash_password(data.password)
    user = {
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hashed_pw,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(user)
    token = create_access_token(str(result.inserted_id))
    return {"access_token": token, "message": "Account created"}


@router.post("/login")
async def login(data: AuthRequest):
    user = await users_collection.find_one({"email": data.email.lower()})

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(str(user["_id"]))
    return {"access_token": token}

@router.get("/check-email")
async def check_email(email: str = Query(...)):
    return {"exists": False}

@router.post("/forgot-password")
async def forgot_password(email: str = Body(..., embed=True)):
    import asyncio
    from app.services.email_service import send_email

    user = await users_collection.find_one({"email": email.lower()})
    if not user:
        return {"message": "If an account exists, a reset code has been sent."}

    code = secrets.randbelow(1000000)
    code_str = f"{code:06d}"
    hashed_code = hashlib.sha256(code_str.encode()).hexdigest()

    await reset_codes_collection.update_one(
        {"user_id": user["_id"]},
        {"$set": {"hashed_code": hashed_code, "expires_at": datetime.utcnow() + timedelta(minutes=15), "used": False}},
        upsert=True
    )

    html = f"""
    <h2>Password Reset Request</h2>
    <p>Use this code to reset your password:</p>
    <h1 style="letter-spacing: 8px; font-size: 32px;">{code_str}</h1>
    <p>This code expires in 15 minutes.</p>
    <p>If you didn't request this, ignore this email.</p>
    """

    await asyncio.to_thread(
        send_email,
        to_email=email,
        subject="Lyra - Password Reset Code",
        html_body=html,
        text_body=f"Your reset code is: {code_str} (expires in 15 min)"
    )

    return {"message": "If an account exists, a reset code has been sent."}
    

@router.post("/verify-code")
async def verify_code(data: VerifyCodeRequest):
    email = data.email
    code = data.code
    reset_code = await reset_codes_collection.find_one({
        "email": email.lower(),
        "code": code,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    if not reset_code:
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

    # Update password
    hashed_pw = hash_password(new_password)  # your hashing function
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hashed_pw}}
    )

    # Mark code as used
    await reset_codes_collection.update_one(
        {"_id": reset_entry["_id"]},
        {"$set": {"used": True}}
    )

    return {"message": "Password reset successfully. Please log in."}
