from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# initialize MongoDB client with error handling
try:
    client = AsyncIOMotorClient(settings.MONGO_URI)
    # optionally perform a quick server_info() call to validate connection immediately
    # this will raise if the server is unreachable
    client.server_info()
except Exception as e:
    logger.error("Failed to connect to MongoDB at %s: %s", settings.MONGO_URI, e)
    # re-raise so startup code can catch/handle if desired
    raise

# database reference
db = client[settings.DB_NAME]

users_collection = db["users"]
projects_collection = db["projects"]
documents_collection = db["documents"]
chapters_collection = db["chapters"]
reset_codes_collection = db["reset_codes"]
