from typing import List
from pydantic import BaseModel

class SceneResponse(BaseModel):
    scene_id: str
    chapter_id: str
    content: str
    scene_wordcount: int
    chapter_wordcount: int
    document_wordcount: int

class SceneOutline(BaseModel):
    id: str
    title: str
    wordcount: int
    order: int

class ChapterOutline(BaseModel):
    id: str
    title: str
    wordcount: int
    order: int
    scenes: List[SceneOutline]

class DocumentOutlineResponse(BaseModel):
    document_id: str
    title: str
    total_wordcount: int
    chapters: List[ChapterOutline]
