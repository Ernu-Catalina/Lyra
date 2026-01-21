# app/schemas/document.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SceneResponse(BaseModel):
    scene_id: str
    chapter_id: str
    content: str
    scene_wordcount: int
    chapter_wordcount: int
    document_wordcount: int

class ChapterResponse(BaseModel):
    id: str
    title: str
    wordcount: int
    order: int
    scenes: List[dict]

class DocumentOutlineResponse(BaseModel):
    document_id: str
    title: str
    total_wordcount: int
    chapters: List[ChapterResponse]

class DocumentResponse(BaseModel):
    id: str = Field(alias="_id")
    project_id: str
    title: str
    type: str
    parent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    total_wordcount: int
    chapter_count: Optional[int] = None
    word_count: Optional[int] = None

class ItemListResponse(BaseModel):
    id: str = Field(alias="_id")
    title: str
    type: str
    parent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    chapter_count: Optional[int] = None
    word_count: Optional[int] = None

class FolderResponse(DocumentResponse):
    type: str = "folder"
    children: Optional[List["ItemListResponse"]] = None