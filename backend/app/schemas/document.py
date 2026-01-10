from typing import Optional
from pydantic import BaseModel

class SceneResponse(BaseModel):
    scene_id: str
    chapter_id: str
    content: str
    scene_wordcount: int
    chapter_wordcount: int
    document_wordcount: int
