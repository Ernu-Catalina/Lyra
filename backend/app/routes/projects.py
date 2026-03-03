# app/routers/projects.py
import re
from fastapi import APIRouter, Depends, Form, HTTPException
from app.database import projects_collection
from app.utils.auth import get_current_user
from datetime import datetime
from app.utils.mongo import serialize_mongo
from bson import ObjectId
from bson import errors as bson_errors
from pydantic import BaseModel
from typing import Optional

class CreateProjectRequest(BaseModel):
    name: str
    cover_image_url: Optional[str] = None

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("")
async def get_projects(user_id=Depends(get_current_user)):
    projects = await projects_collection.find({"user_id": ObjectId(user_id)}).to_list(100)
    return [serialize_mongo(p) for p in projects]

@router.get("/{project_id}")
async def get_project(project_id: str, user_id=Depends(get_current_user)):
    try:
        project = await projects_collection.find_one({
            "_id": ObjectId(project_id),
            "user_id": ObjectId(user_id)
        })
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return serialize_mongo(project)

@router.post("")
async def create_project(
    request: CreateProjectRequest,
    user_id=Depends(get_current_user)
):
    if not request.name.strip():
        raise HTTPException(status_code=422, detail="Project name is required")

    name = request.name.strip()
    # ensure unique per user (case-insensitive)
    escaped = re.escape(name)
    existing = await projects_collection.find_one({
        "user_id": ObjectId(user_id),
        "name": {"$regex": f"^{escaped}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=409, detail="A project with that name already exists")

    project = {
        "user_id": ObjectId(user_id),
        "name": name,
        "cover_image_url": request.cover_image_url,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await projects_collection.insert_one(project)
    project["_id"] = result.inserted_id
    return serialize_mongo(project)

@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    data: dict,  # e.g. {"name": "...", "cover_image_url": "...", "pinned": true/false}
    user_id=Depends(get_current_user)
):
    project = await projects_collection.find_one({"_id": ObjectId(project_id), "user_id": ObjectId(user_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # whitelist allowed updatable fields
    allowed = {"name", "cover_image_url", "pinned"}
    update_data: dict = {}
    for k, v in data.items():
        if k in allowed and v is not None:
            update_data[k] = v

    if "name" in update_data:
        if not isinstance(update_data["name"], str):
            raise HTTPException(status_code=400, detail="Invalid project name")
        name_val = update_data["name"].strip()
        if not name_val:
            raise HTTPException(status_code=400, detail="Project name is required")
        escaped = re.escape(name_val)
        conflict = await projects_collection.find_one({
            "user_id": ObjectId(user_id),
            "name": {"$regex": f"^{escaped}$", "$options": "i"},
            "_id": {"$ne": ObjectId(project_id)}
        })
        if conflict:
            raise HTTPException(status_code=409, detail="A project with that name already exists")
        update_data["name"] = name_val

    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": update_data}
        )

    updated = await projects_collection.find_one({"_id": ObjectId(project_id)})
    return serialize_mongo(updated)

@router.delete("/{project_id}")
async def delete_project(project_id: str, user_id=Depends(get_current_user)):
    result = await projects_collection.delete_one({"_id": ObjectId(project_id), "user_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found or not owned")
    return {"message": "Project deleted"}