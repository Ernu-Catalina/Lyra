from pydantic import BaseModel
from typing import Optional, List

class CreateDocumentRequest(BaseModel):
    title: str
    type: Optional[str] = "document"  # "document" or "folder"
    parent_id: Optional[str] = None

class CreateChapterRequest(BaseModel):
    title: str

class CreateSceneRequest(BaseModel):
    title: str

class RenameRequest(BaseModel):
    title: str

class ReorderRequest(BaseModel):
    ordered_ids: List[str]

class SceneAutosaveRequest(BaseModel):
    content: str