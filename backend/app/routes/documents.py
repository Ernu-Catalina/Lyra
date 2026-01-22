import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from bson import ObjectId
from datetime import datetime
from typing import Optional, List

from app.database import (
    projects_collection,
    documents_collection,
    chapters_collection
)
from app.utils.auth import get_current_user
from app.services.wordcount_service import count_words, sum_scene_wordcounts
from app.schemas.requests import (
    CreateDocumentRequest,
    CreateChapterRequest,
    CreateSceneRequest,
    ReorderRequest,
    SceneAutosaveRequest
)
from app.schemas.document import (
    SceneResponse,
    DocumentOutlineResponse,
    DocumentResponse,
    ChapterResponse,
    ItemListResponse
)
from app.utils.mongo import serialize_mongo

router = APIRouter(
    prefix="/projects/{project_id}/documents",
    tags=["documents"]
)


def ensure_objectid(val):
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

    return serialize_mongo(document) if document else None


# ────────────────────────────────────────────────
# CREATE DOCUMENT or FOLDER
# ────────────────────────────────────────────────
@router.post("/", response_model=DocumentResponse)
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
        "title": data.title.strip(),
        "type": data.type if hasattr(data, "type") and data.type in ["document", "folder"] else "document",
        "parent_id": ensure_objectid(data.parent_id) if data.parent_id else None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "total_wordcount": 0,
        "chapters": [] if data.type != "folder" else None,
    }

    result = await documents_collection.insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_mongo(document)


# ────────────────────────────────────────────────
# CREATE SCENE (only for documents)
# ────────────────────────────────────────────────
@router.post("/{document_id}/chapters/{chapter_id}/scenes", response_model=SceneResponse)
async def create_scene(
    project_id: str,
    document_id: str,
    chapter_id: str,
    data: CreateSceneRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document or document["type"] == "folder":
        raise HTTPException(status_code=404, detail="Document not found or is a folder")

    chapter = next((c for c in document["chapters"] if c["id"] == chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    scene = {
        "id": str(uuid.uuid4()),
        "title": data.title.strip(),
        "order": len(chapter["scenes"]),
        "wordcount": 0,
        "content": ""
    }

    await documents_collection.update_one(
        {"_id": ObjectId(document_id), "chapters.id": chapter_id},
        {"$push": {"chapters.$.scenes": scene}, "$set": {"updated_at": datetime.utcnow()}}
    )

    return scene


# ────────────────────────────────────────────────
# LIST DOCUMENTS / FOLDERS (root or nested)
# ────────────────────────────────────────────────
@router.get("/", response_model=List[ItemListResponse])
async def get_documents(
    project_id: str,
    parent_id: Optional[str] = Query(None, description="Filter by parent folder ID (null for root)"),
    user_id=Depends(get_current_user)
):
    project = await projects_collection.find_one({
        "_id": ObjectId(project_id),
        "user_id": ObjectId(user_id)
    })
    if not project:
        raise HTTPException(status_code=403, detail="Project not found or not owned")

    query = {"project_id": ObjectId(project_id)}

    # ── Robust parent_id handling ─────────────────────────────────────
    if parent_id is not None:
        if parent_id == "null" or parent_id == "":
            query["parent_id"] = None
        else:
            try:
                oid = ObjectId(parent_id)
                query["parent_id"] = {"$in": [oid, parent_id]}  # Handle both ObjectId and string
            except Exception as e:
                print(f"[DEBUG] Invalid parent_id '{parent_id}': {e}")
                query["parent_id"] = None  # fallback to root instead of error
    else:
        # Default to root when no parent_id provided
        query["parent_id"] = None

    print(f"[DEBUG GET DOCUMENTS] Query: {query}")

    items = await documents_collection.find(query).sort("title", 1).to_list(100)
    print(f"[DEBUG] Found {len(items)} items for query {query}")

    result = []
    for item in items:
        item_dict = serialize_mongo(item)
        item_type = item_dict.get("type", "document")
        item_dict["type"] = item_type

        if item_type == "document":
            chapters = item_dict.get("chapters", [])
            item_dict["chapter_count"] = len(chapters)
            item_dict["word_count"] = sum(ch.get("wordcount", 0) for ch in chapters)

        result.append(item_dict)

    return result


# ────────────────────────────────────────────────
# GET SINGLE DOCUMENT / FOLDER
# ────────────────────────────────────────────────
@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    project_id: str,
    document_id: str,
    user_id=Depends(get_current_user)
):
    doc = await get_owned_document(user_id, project_id, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document or folder not found")

    # Safely get type
    doc_type = doc.get("type", "document")

    if doc_type == "document":
        chapters = doc.get("chapters", [])
        chapter_count = len(chapters)
        doc["chapter_count"] = chapter_count
        doc["word_count"] = sum(ch.get("wordcount", 0) for ch in chapters)

    return doc

# ────────────────────────────────────────────────
# REORDER CHAPTERS
# ────────────────────────────────────────────────
@router.put("/{document_id}/chapters/reorder")
async def reorder_chapters(
    project_id: str,
    document_id: str,
    payload: ReorderRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document or document["type"] == "folder":
        raise HTTPException(status_code=404, detail="Document not found or is a folder")

    chapter_map = {c["id"]: c for c in document["chapters"]}

    if set(payload.ordered_ids) != set(chapter_map.keys()):
        raise HTTPException(status_code=400, detail="Invalid chapter IDs")

    reordered = []
    for index, cid in enumerate(payload.ordered_ids):
        chapter_map[cid]["order"] = index
        reordered.append(chapter_map[cid])

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": {"chapters": reordered, "updated_at": datetime.utcnow()}}
    )

    return {"status": "Chapters reordered"}


# ────────────────────────────────────────────────
# REORDER SCENES IN CHAPTER
# ────────────────────────────────────────────────
@router.put("/{document_id}/chapters/{chapter_id}/scenes/reorder")
async def reorder_scenes(
    project_id: str,
    document_id: str,
    chapter_id: str,
    payload: ReorderRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document or document["type"] == "folder":
        raise HTTPException(status_code=404, detail="Document not found or is a folder")

    chapter = next((c for c in document["chapters"] if c["id"] == chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    scene_map = {s["id"]: s for s in chapter["scenes"]}

    if set(payload.ordered_ids) != set(scene_map.keys()):
        raise HTTPException(status_code=400, detail="Invalid scene IDs")

    reordered = []
    for index, sid in enumerate(payload.ordered_ids):
        scene_map[sid]["order"] = index
        reordered.append(scene_map[sid])

    chapter["scenes"] = reordered

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": {"chapters": document["chapters"], "updated_at": datetime.utcnow()}}
    )

    return {"status": "Scenes reordered"}


# ────────────────────────────────────────────────
# AUTOSAVE SCENE CONTENT
# ────────────────────────────────────────────────
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
    if not document or document["type"] == "folder":
        raise HTTPException(status_code=404, detail="Document not found or is a folder")

    chapter = next((c for c in document["chapters"] if c["id"] == chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    scene = next((s for s in chapter["scenes"] if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    content = payload.content
    scene_wordcount = count_words(content)
    scene["content"] = content
    scene["wordcount"] = scene_wordcount

    chapter["wordcount"] = sum_scene_wordcounts(chapter["scenes"])

    total_wordcount = sum(c["wordcount"] for c in document["chapters"])

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": {
            "chapters": document["chapters"],
            "total_wordcount": total_wordcount,
            "updated_at": datetime.utcnow()
        }}
    )

    return {
        "scene_id": scene_id,
        "scene_wordcount": scene_wordcount,
        "chapter_wordcount": chapter["wordcount"],
        "document_wordcount": total_wordcount
    }


# ────────────────────────────────────────────────
# GET SINGLE SCENE
# ────────────────────────────────────────────────
@router.get("/{document_id}/chapters/{chapter_id}/scenes/{scene_id}", response_model=SceneResponse)
async def get_scene(
    project_id: str,
    document_id: str,
    chapter_id: str,
    scene_id: str,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document or document["type"] == "folder":
        raise HTTPException(status_code=404, detail="Document not found or is a folder")

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


# ────────────────────────────────────────────────
# GET DOCUMENT OUTLINE (only for documents)
# ────────────────────────────────────────────────
@router.get("/{document_id}/outline", response_model=DocumentOutlineResponse)
async def get_document_outline(
    project_id: str,
    document_id: str,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    doc_type = document.get("type", "document")
    if doc_type == "folder":
        raise HTTPException(status_code=400, detail="Outline is only available for documents, not folders")

    chapters = sorted(document["chapters"], key=lambda c: c["order"])
    for ch in chapters:
        ch["scenes"] = sorted(ch["scenes"], key=lambda s: s["order"])

    return {
        "document_id": str(document["_id"]),
        "title": document["title"],
        "total_wordcount": document.get("total_wordcount", 0),
        "chapters": chapters
    }


# ────────────────────────────────────────────────
# RENAME DOCUMENT / FOLDER
# ────────────────────────────────────────────────
@router.patch("/{document_id}")
async def update_document(
    project_id: str,
    document_id: str,
    data: dict = Body(...),
    user_id=Depends(get_current_user)
):
    doc = await get_owned_document(user_id, project_id, document_id)
    if not doc:
        raise HTTPException(404, "Document or folder not found or not owned")

    update_data = {k: v for k, v in data.items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await documents_collection.update_one(
            {"_id": ObjectId(document_id), "project_id": ObjectId(project_id)},
            {"$set": update_data}
        )

    updated = await documents_collection.find_one({"_id": ObjectId(document_id)})
    return serialize_mongo(updated)


# ────────────────────────────────────────────────
# DELETE DOCUMENT / FOLDER
# ────────────────────────────────────────────────
@router.delete("/{document_id}")
async def delete_document(
    project_id: str,
    document_id: str,
    user_id=Depends(get_current_user)
):
    doc = await get_owned_document(user_id, project_id, document_id)
    if not doc:
        raise HTTPException(404, "Document or folder not found or not owned")

    result = await documents_collection.delete_one({
        "_id": ObjectId(document_id),
        "project_id": ObjectId(project_id),
    })
    if result.deleted_count == 0:
        raise HTTPException(404, "Document or folder not found")

    return {"message": "Deleted successfully"}


# ────────────────────────────────────────────────
# CREATE CHAPTER (only for documents)
# ────────────────────────────────────────────────
@router.post("/{document_id}/chapters")
async def create_chapter(
    project_id: str,
    document_id: str,
    data: CreateChapterRequest,
    user_id=Depends(get_current_user)
):
    document = await get_owned_document(user_id, project_id, document_id)
    if not document or document.get("type", "document") == "folder":
        raise HTTPException(status_code=404, detail="Document not found or is a folder")

    chapter = {
        "id": str(uuid.uuid4()),
        "title": data.title.strip(),
        "order": len(document["chapters"]),
        "wordcount": 0,
        "scenes": []
    }

    await documents_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$push": {"chapters": chapter}, "$set": {"updated_at": datetime.utcnow()}}
    )

    return chapter