from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# initialize MongoDB client with error handling
client = AsyncIOMotorClient(settings.MONGO_URL)

# database reference
db = client[settings.DB_NAME]

users_collection = db["users"]
projects_collection = db["projects"]
documents_collection = db["documents"]
chapters_collection = db["chapters"]
reset_codes_collection = db["reset_codes"]

async def create_indexes():
    """Create necessary indexes on startup"""
    try:
        # Unique index on email (case-insensitive via collation)
        await users_collection.create_index(
            [("email", 1)],
            unique=True,
            collation={"locale": "en", "strength": 2}  # case-insensitive
        )
        logger.info("Unique index on users.email created successfully")
    except Exception as e:
        logger.warning(f"Could not create index on users.email: {e}")