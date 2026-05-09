import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    """Create database connection"""
    try:
        print(f"Attempting MongoDB connection to: {settings.MONGODB_URL[:50]}...")
        print(f"Database name: {settings.DATABASE_NAME}")
        
        db.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000  # 5 second timeout
        )
        db.db = db.client[settings.DATABASE_NAME]
        
        # Test connection with timeout
        await db.client.admin.command('ping')
        logging.info(f"Connected to MongoDB at {settings.MONGODB_URL[:50]}...")
        print("Successfully connected to MongoDB!")
        
    except Exception as e:
        logging.warning(f"Could not connect to MongoDB: {e}")
        print(f"MongoDB connection failed: {e}")
        logging.info("API will run without database connection for testing")
        # Don't raise exception - allow API to start without DB

async def close_mongo_connection():
    """Close database connection"""
    try:
        if db.client:
            db.client.close()
            logging.info("Disconnected from MongoDB")
    except Exception as e:
        logging.warning(f"Error closing MongoDB connection: {e}")