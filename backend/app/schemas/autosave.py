from pydantic import BaseModel

class SceneAutosaveRequest(BaseModel):
    content: str
