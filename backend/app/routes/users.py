# app/routers/users.py  (create if missing)
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Body  
from bson import ObjectId

from app.utils.auth import get_current_user
from app.database import users_collection
from app.utils.mongo import serialize_mongo

router = APIRouter(prefix="", tags=["users"])

@router.get("/me")
async def get_current_user_info(current_user=Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(current_user)})
    if not user:
        raise HTTPException(404, "User not found")
    return serialize_mongo(user)

@router.patch("/me/settings")
async def update_user_settings(
    settings: Dict[str, Any] = Body(...),
    user_id=Depends(get_current_user)
):
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"settings": settings, "updated_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "User not found or no changes")
    return {"message": "Settings updated"}