import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def fix_data():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["timetable_system1"]
    
    # 1. Get a valid user (Admin or Coordinator)
    user = await db.users.find_one({"role": {"$in": ["admin", "coordinator"]}})
    if not user:
        print("No admin/coordinator found! Please run seed first.")
        return
    user_id = user["_id"]
    print(f"Assigning ownership to: {user['email']} (ID: {user_id})")

    # 2. Get a valid program
    program = await db.programs.find_one()
    if not program:
        print("No program found! Creating a default one.")
        # Try to insert a default program if none exists
        prog_res = await db.programs.insert_one({
            "name": "Default Program",
            "department": "Academics",
            "duration_years": 4,
            "created_by": user_id
        })
        program_id = prog_res.inserted_id
    else:
        program_id = program["_id"]
    print(f"Assigning courses to program: {program.get('name', 'Default')} (ID: {program_id})")

    # 3. Update Courses
    print("Updating courses...")
    res = await db.courses.update_many(
        {"created_by": {"$exists": False}}, 
        {"$set": {"created_by": user_id, "program_id": program_id}}
    )
    res2 = await db.courses.update_many(
        {"program_id": {"$exists": False}},
        {"$set": {"program_id": program_id}}
    )
    print(f"Updated {res.modified_count + res2.modified_count} courses.")

    # 4. Update Faculty
    print("Updating faculty...")
    res = await db.faculty.update_many(
        {"created_by": {"$exists": False}},
        {"$set": {"created_by": user_id}}
    )
    print(f"Updated {res.modified_count} faculty members.")

    # 5. Update Rooms
    print("Updating rooms...")
    res = await db.rooms.update_many(
        {"created_by": {"$exists": False}},
        {"$set": {"created_by": user_id}}
    )
    print(f"Updated {res.modified_count} rooms.")

    # 6. Update Student Groups
    print("Updating student groups...")
    res = await db.student_groups.update_many(
        {"created_by": {"$exists": False}},
        {"$set": {"created_by": user_id, "program_id": str(program_id)}}
    )
    print(f"Updated {res.modified_count} student groups.")

    client.close()
    print("Fix complete. Data should now be visible in the UI.")

if __name__ == "__main__":
    asyncio.run(fix_data())
