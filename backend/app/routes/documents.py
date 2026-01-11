import uuid
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.database import documents_collection, projects_collection
from app.utils.auth import get_current_user
from app.services.wordcount_service import count_words, sum_scene_wordcounts
from app.schemas.requests import CreateDocumentRequest, CreateChapterRequest, CreateSceneRequest
from app.utils.mongo import serialize_mongo
from app.schemas.autosave import SceneAutosaveRequest
from app.schemas.document import SceneResponse, DocumentOutlineResponse, ReorderRequest

router = APIRouter(
    prefix="/projects/{project_id}/documents",
    tags=["documents"]
)

def ensure_objectid(val):
    from bson import ObjectId
    return val if isinstance(val, ObjectId) else ObjectId(val)

async def get_owned_document(
    user_id: str,
    project_id: str,
    document_id: str
):
    project = await projects_collection.find_one({
        "_id": ensure_objectid(project_id),
        "user_id": ensure_objectid(user_id)
    })

    if not project:
        return None

    document = await documents_collection.find_one({
        "_id": ensure_objectid(document_id),
        "project_id": ensure_objectid(project_id)
    })

    return serialize_mongo(document)

@router.post("/")
async def create_document(
    project_id: str,
    data: CreateDocumentRequest,
    user_id=Depends(get_current_user)
):
    project = await projects_collection.find_one({
        "_id": ObjectId(project_id),
        "user_id": ObjectId(user_id)
    })

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    document = {
        "project_id": ObjectId(project_id),
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
    project_id: str,
    document_id: str,
    data: CreateChapterRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    chapter = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "order": len(document["chapters"]),
        "wordcount": 0,
        "scenes": []
    }

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$push": {"chapters": chapter}}
    )

    return serialize_mongo(chapter)

@router.post("/{document_id}/chapters/{chapter_id}/scenes")
async def create_scene(
    project_id: str,
    document_id: str,
    chapter_id: str,
    data: CreateSceneRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    scene = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "order": 0,
        "wordcount": 0,
        "content": ""
    }

    result = await documents_collection.update_one(
        {
            "_id": ObjectId(document_id),
            "chapters.id": chapter_id
        },
        {"$push": {"chapters.$.scenes": scene}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return serialize_mongo(scene)


@router.get("/{document_id}/chapters")
async def get_chapters(
    project_id: str,
    document_id: str,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return [
        {
            "id": c["id"],
            "title": c["title"],
            "wordcount": c["wordcount"],
            "order": c["order"],
            "scenes": [
                {
                    "id": s["id"],
                    "title": s["title"],
                    "wordcount": s["wordcount"],
                    "order": s["order"]
                } for s in c["scenes"]
            ]
        }
        for c in document["chapters"]
    ]

@router.put("/{document_id}/chapters/{chapter_id}/scenes/{scene_id}")
async def autosave_scene(
    project_id: str,
    document_id: str,
    chapter_id: str,
    scene_id: str,
    payload: SceneAutosaveRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    # Find the chapter by chapter_id
    chapter = next((c for c in document["chapters"] if c["id"] == chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    scene = next((s for s in chapter["scenes"] if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    # Update scene content and wordcount
    content = payload.content
    scene_wordcount = count_words(content)
    scene["content"] = content
    scene["wordcount"] = scene_wordcount
    chapter["wordcount"] = sum_scene_wordcounts(chapter["scenes"])
    total_wordcount = sum(
        c["wordcount"] for c in document["chapters"]
    )
    await documents_collection.update_one(
        {"_id": ensure_objectid(document_id)},
        {"$set": {
            "chapters": document["chapters"],
            "total_wordcount": total_wordcount,
            "updated_at": datetime.utcnow()
        }}
    )
    return {
        "scene_id": scene_id,
        "scene_wordcount": scene_wordcount,
        "document_wordcount": total_wordcount
    }

@router.get("/{document_id}/chapters/{chapter_id}/scenes/{scene_id}", response_model=SceneResponse)
async def get_scene(
    project_id: str,
    document_id: str,
    chapter_id: str,
    scene_id: str,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    chapter = next((c for c in document["chapters"] if c["id"] == chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    scene = next((s for s in chapter["scenes"] if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    return {
        "scene_id": scene_id,
        "chapter_id": chapter["id"],
        "content": scene.get("content", ""),
        "scene_wordcount": scene["wordcount"],
        "chapter_wordcount": chapter["wordcount"],
        "document_wordcount": document["total_wordcount"]
    }

@router.get("/{document_id}/outline", response_model=DocumentOutlineResponse)
async def get_document_outline(
    project_id: str,
    document_id: str,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": document_id,
        "title": document["title"],
        "total_wordcount": document["total_wordcount"],
        "chapters": [
            {
                "id": c["id"],
                "title": c["title"],
                "wordcount": c["wordcount"],
                "order": c["order"],
                "scenes": [
                    {
                        "id": s["id"],
                        "title": s["title"],
                        "wordcount": s["wordcount"],
                        "order": s["order"]
                    } for s in c["scenes"]
                ]
            }
            for c in document["chapters"]
        ]
    }

@router.put("/{document_id}/chapters/reorder")
async def reorder_chapters(
    project_id: str,
    document_id: str,
    payload: ReorderRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    chapter_map = {c["id"]: c for c in document["chapters"]}

    if set(payload.ordered_ids) != set(chapter_map.keys()):
        raise HTTPException(status_code=400, detail="Invalid chapter IDs")

    reordered = []
    for index, cid in enumerate(payload.ordered_ids):
        chapter_map[cid]["order"] = index
        reordered.append(chapter_map[cid])

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": {"chapters": reordered}}
    )

    return {"status": "chapters reordered"}

@router.put("/{document_id}/chapters/{chapter_id}/scenes/reorder")
async def reorder_scenes(
    project_id: str,
    document_id: str,
    chapter_id: str,
    payload: ReorderRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    for chapter in document["chapters"]:
        if chapter["id"] == chapter_id:
            scene_map = {s["id"]: s for s in chapter["scenes"]}

            if set(payload.ordered_ids) != set(scene_map.keys()):
                raise HTTPException(status_code=400, detail="Invalid scene IDs")

            reordered = []
            for index, sid in enumerate(payload.ordered_ids):
                scene_map[sid]["order"] = index
                reordered.append(scene_map[sid])

            chapter["scenes"] = reordered
            break
    else:
        raise HTTPException(status_code=404, detail="Chapter not found")

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": {"chapters": document["chapters"]}}
    )

    return {"status": "scenes reordered"}
