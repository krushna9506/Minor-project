import asyncio
from app.db.mongodb import connect_to_mongo, db
import random

async def assign_faculty():
    await connect_to_mongo()
    
    faculty = await db.db.faculty.find().to_list(100)
    courses = await db.db.courses.find().to_list(1000)
    
    faculty_ids = [f["_id"] for f in faculty]
    
    for course in courses:
        if not course.get("faculty_id"):
            assigned = random.choice(faculty_ids)
            await db.db.courses.update_one(
                {"_id": course["_id"]},
                {"$set": {"faculty_id": assigned}}
            )
    
    print(f"Assigned faculty to {len(courses)} courses")

if __name__ == "__main__":
    asyncio.run(assign_faculty())