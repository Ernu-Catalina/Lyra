from fastapi import APIRouter, Depends
from app.database import projects_collection
from app.utils.auth import get_current_user
from datetime import datetime
from app.schemas.requests import CreateProjectRequest
from app.utils.mongo import serialize_mongo

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/")
async def get_projects(user_id=Depends(get_current_user)):
    projects = await projects_collection.find({"user_id": user_id}).to_list(100)
    return [serialize_mongo(p) for p in projects]

@router.post("/")
async def create_project(
    data: CreateProjectRequest,
    user_id=Depends(get_current_user)
):
    project = {
        "user_id": user_id,
        "name": data.name,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await projects_collection.insert_one(project)
    project["_id"] = result.inserted_id
    return serialize_mongo(project)
