from fastapi import APIRouter, HTTPException
from app.database import users_collection, reset_codes_collection
from app.utils.security import hash_password, verify_password
from app.services.auth_service import create_access_token, send_email
from app.schemas.auth import AuthRequest
from app.schemas.auth import RegisterRequest
from app.schemas.auth import ResetPasswordRequest
from fastapi import Query
from datetime import datetime, timedelta
import random
import string

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
    # Obfuscate response to prevent email enumeration
    # Always return exists: False to avoid leaking registration status
    return {"exists": False}

@router.post("/forgot-password")
async def forgot_password(email: str):
    user = await users_collection.find_one({"email": email.lower()})
    if not user:
        # Don't reveal if email exists
        return {"message": "If an account exists, a reset code has been sent."}
    
    code = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    await reset_codes_collection.insert_one({
        "email": email.lower(),
        "code": code,
        "expires_at": expires_at,
        "used": False
    })
    
    # Send email
    subject = "Password Reset Code"
    body = f"Your password reset code is: {code}. It expires in 15 minutes."
    send_email(email, subject, body)
    
    return {"message": "If an account exists, a reset code has been sent."}

@router.post("/verify-code")
async def verify_code(email: str, code: str):
    reset_code = await reset_codes_collection.find_one({
        "email": email.lower(),
        "code": code,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    if not reset_code:
        raise HTTPException(400, "Invalid or expired code")
    
    return {"valid": True}

@router.patch("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_code = await reset_codes_collection.find_one({
        "email": data.email.lower(),
        "code": data.code,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    if not reset_code:
        raise HTTPException(400, "Invalid or expired code")
    
    hashed_pw = hash_password(data.new_password)
    await users_collection.update_one(
        {"email": data.email.lower()},
        {"$set": {"password_hash": hashed_pw}}
    )
    
    await reset_codes_collection.update_one(
        {"_id": reset_code["_id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}
