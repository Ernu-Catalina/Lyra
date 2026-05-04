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
refresh_tokens_collection = db["refresh_tokens"]
email_verifications_collection = db["email_verifications"]

async def create_indexes():
    """Create necessary indexes on startup"""
    try:
        # Unique index on email (case-insensitive via collation)
        await users_collection.create_index(
            [("email", 1)],
            unique=True,
            collation={"locale": "en", "strength": 2}
        )
        # Refresh tokens: fast lookup by hash; no TTL — valid until explicit logout
        await refresh_tokens_collection.create_index("token_hash", unique=True)
        # Email verification tokens: fast lookup by hash + TTL auto-expiry
        await email_verifications_collection.create_index(
            "token_hash", unique=True
        )
        await email_verifications_collection.create_index(
            "expires_at", expireAfterSeconds=0
        )
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Could not create indexes: {e}")