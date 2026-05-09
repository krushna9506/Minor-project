import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def reset():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["timetable_system1"]
    result = await db.users.delete_many({"email": "admin@example.com"})
    print(f"Deleted {result.deleted_count} admin users")

if __name__ == "__main__":
    asyncio.run(reset())
