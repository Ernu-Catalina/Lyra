from pydantic import BaseModel

class CreateProjectRequest(BaseModel):
    name: str

class CreateDocumentRequest(BaseModel):
    project_id: str
    title: str

class CreateChapterRequest(BaseModel):
    title: str

class CreateSceneRequest(BaseModel):
    title: str