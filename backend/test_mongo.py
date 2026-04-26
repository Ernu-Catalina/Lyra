from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

async def test():
    mongo_url = os.getenv("MONGO_URL")
    print("Testing connection with URL:", mongo_url)
    
    try:
        client = AsyncIOMotorClient(mongo_url)
        await client.admin.command('ping')
        print("SUCCESS: MongoDB connection successful!")
        print("Database name:", os.getenv("DB_NAME", "lyra"))
        await client.close()
    except Exception as e:
        print("FAILED: Connection error:", str(e))

asyncio.run(test())