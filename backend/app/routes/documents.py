import uuid
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.database import documents_collection
from app.utils.auth import get_current_user
from app.services.wordcount_service import count_words, sum_scene_wordcounts
from app.schemas.requests import CreateDocumentRequest, CreateChapterRequest, CreateSceneRequest
from app.utils.mongo import serialize_mongo
from app.schemas.autosave import SceneAutosaveRequest
from app.schemas.document import SceneResponse, DocumentOutlineResponse

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/")
async def create_document(
    data: CreateDocumentRequest,
    user_id=Depends(get_current_user)
):
    document = {
        "project_id": data.project_id,
        "title": data.title,
        "total_wordcount": 0,
        "chapters": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await documents_collection.insert_one(document)
    document["_id"] = result.inserted_id
    return serialize_mongo(document)

@router.post("/{document_id}/chapters")
async def create_chapter(
    document_id: str,
    data: CreateChapterRequest,
    user_id=Depends(get_current_user)
):
    chapter = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "order": 0,
        "wordcount": 0,
        "scenes": []
    }

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$push": {"chapters": chapter}}
    )

    return chapter

@router.post("/{document_id}/chapters/{chapter_id}/scenes")
async def create_scene(
    document_id: str,
    chapter_id: str,
    data: CreateSceneRequest,
    user_id=Depends(get_current_user)
):
    scene = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "order": 0,
        "wordcount": 0,
        "content": ""
    }

    await documents_collection.update_one(
        {
            "_id": ObjectId(document_id),
            "chapters.id": chapter_id
        },
        {"$push": {"chapters.$.scenes": scene}}
    )

    return scene

@router.get("/{document_id}/chapters")
async def get_chapters(
    document_id: str,
    user_id=Depends(get_current_user)
):
    document = await documents_collection.find_one(
        {"_id": ObjectId(document_id)},
        {
            "chapters.id": 1,
            "chapters.title": 1,
            "chapters.wordcount": 1,
            "chapters.scenes.id": 1,
            "chapters.scenes.title": 1,
            "chapters.scenes.wordcount": 1,
        }
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document["chapters"]

@router.put("/{document_id}/scenes/{scene_id}")
async def autosave_scene(
    document_id: str,
    scene_id: str,
    payload: SceneAutosaveRequest,
    user_id=Depends(get_current_user)
):
    content = payload.content
    scene_wordcount = count_words(content)

    document = await documents_collection.find_one(
        {"_id": ObjectId(document_id)}
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    for chapter in document["chapters"]:
        for scene in chapter["scenes"]:
            if scene["id"] == scene_id:
                scene["content"] = content
                scene["wordcount"] = scene_wordcount

        chapter["wordcount"] = sum_scene_wordcounts(chapter["scenes"])

    total_wordcount = sum(
        chapter["wordcount"] for chapter in document["chapters"]
    )

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {
            "$set": {
                "chapters": document["chapters"],
                "total_wordcount": total_wordcount,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {
        "scene_id": scene_id,
        "scene_wordcount": scene_wordcount,
        "document_wordcount": total_wordcount
    }

@router.get("/{document_id}/scenes/{scene_id}", response_model=SceneResponse)
async def get_scene(
    document_id: str,
    scene_id: str,
    user_id=Depends(get_current_user)
):
    document = await documents_collection.find_one(
        {"_id": ObjectId(document_id)}
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    for chapter in document["chapters"]:
        for scene in chapter["scenes"]:
            if scene["id"] == scene_id:
                return {
                    "scene_id": scene_id,
                    "chapter_id": chapter["id"],
                    "content": scene.get("content", ""),
                    "scene_wordcount": scene.get("wordcount", 0),
                    "chapter_wordcount": chapter.get("wordcount", 0),
                    "document_wordcount": document.get("total_wordcount", 0),
                }

    raise HTTPException(status_code=404, detail="Scene not found")

@router.get("/{document_id}/outline", response_model=DocumentOutlineResponse)
async def get_document_outline(
    document_id: str,
    user_id=Depends(get_current_user)
):
    document = await documents_collection.find_one(
        {"_id": ObjectId(document_id)}
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    chapters = []

    for chapter in document.get("chapters", []):
        scenes = [
            {
                "id": scene["id"],
                "title": scene.get("title", "Untitled Scene"),
                "wordcount": scene.get("wordcount", 0),
                "order": scene.get("order", 0),
            }
            for scene in chapter.get("scenes", [])
        ]

        chapters.append({
            "id": chapter["id"],
            "title": chapter.get("title", "Untitled Chapter"),
            "wordcount": chapter.get("wordcount", 0),
            "order": chapter.get("order", 0),
            "scenes": scenes,
        })

    return {
        "document_id": document_id,
        "title": document.get("title", ""),
        "total_wordcount": document.get("total_wordcount", 0),
        "chapters": chapters,
    }
