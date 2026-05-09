import asyncio
from app.db.mongodb import connect_to_mongo, db

async def main():
    await connect_to_mongo()
    programs = await db.db.programs.find().to_list(100)
    print(f'programs={len(programs)}')
    for p in programs:
        print(p)

if __name__ == '__main__':
    asyncio.run(main())