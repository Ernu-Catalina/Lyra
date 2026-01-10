from fastapi import APIRouter, HTTPException
from app.database import users_collection
from app.utils.security import hash_password, verify_password
from app.services.auth_service import create_access_token
from app.schemas.auth import AuthRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(data: AuthRequest):
    if await users_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = {
        "email": data.email,
        "password_hash": hash_password(data.password),
        "settings": {
            "theme": "dark",
            "wordcount_display": "both",
            "default_view": "scene"
        }
    }

    result = await users_collection.insert_one(user)
    token = create_access_token(str(result.inserted_id))
    return {"access_token": token}


@router.post("/login")
async def login(data: AuthRequest):
    user = await users_collection.find_one({"email": data.email})

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(str(user["_id"]))
    return {"access_token": token}
