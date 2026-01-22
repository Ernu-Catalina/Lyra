from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

users_collection = db["users"]
projects_collection = db["projects"]
documents_collection = db["documents"]
chapters_collection = db["chapters"]
reset_codes_collection = db["reset_codes"]
