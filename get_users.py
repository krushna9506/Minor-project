import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def get_users():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["timetable_system1"]
    cursor = db.users.find()
    print("USERS IN DATABASE:")
    async for user in cursor:
        print(f"ID: {user['_id']} | Email: {user['email']} | Role: {user['role']}")
    client.close()

if __name__ == "__main__":
    asyncio.run(get_users())
