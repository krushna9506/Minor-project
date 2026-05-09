import asyncio
import csv
from app.db.mongodb import connect_to_mongo, db
from datetime import datetime

async def import_faculty():
    await connect_to_mongo()
    
    # Get admin user
    admin = await db.db.users.find_one({"role": "admin"})
    if not admin:
        print("No admin user found")
        return
    admin_id = admin["_id"]
    
    with open("../archive/instructors.csv", "r") as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            faculty = {
                "name": f"{row['first_name']} {row['last_name']}",
                "employee_id": row['instructor_id'],
                "department": row['department'],
                "designation": "Professor",
                "email": row['email'],
                "subjects": [],
                "max_hours_per_week": 16,
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "created_by": admin_id,
                "created_at": datetime.utcnow()
            }
            await db.db.faculty.insert_one(faculty)
            count += 1
        print(f"Imported {count} faculty members")

if __name__ == "__main__":
    asyncio.run(import_faculty())