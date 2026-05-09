import asyncio
from app.db.mongodb import connect_to_mongo, db

async def main():
    await connect_to_mongo()
    admin = await db.db.users.find_one({'email':'admin@example.com'})
    print(admin)

if __name__ == '__main__':
    asyncio.run(main())