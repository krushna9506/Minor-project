"""
Test script to check student groups functionality
"""
import asyncio
from bson import ObjectId
from app.db.mongodb import db, connect_to_mongo

async def test_student_groups():
    print("🧪 Testing Student Groups\n")
    
    await connect_to_mongo()
    
    if db.db is None:
        print("❌ Failed to connect to database")
        return
    
    print("✅ Connected to database\n")
    
    # Get a program
    program = await db.db.programs.find_one({})
    if not program:
        print("❌ No programs found")
        return
    
    program_id = str(program["_id"])
    print(f"📚 Using program: {program.get('program_name')} (ID: {program_id})\n")
    
    # Check existing student groups
    groups = await db.db.student_groups.find({"program_id": program_id}).to_list(length=100)
    print(f"👥 Found {len(groups)} existing student groups")
    
    for group in groups:
        print(f"   - {group.get('name')} (Semester: {group.get('semester')}, Year: {group.get('year')})")
    
    print("\n" + "="*60)
    
    # Check what the template service would find
    print("\n🔍 Testing template service query:")
    
    # Test with ObjectId
    groups_objectid = await db.db.student_groups.find({
        "program_id": ObjectId(program_id)
    }).to_list(length=50)
    print(f"   Query with ObjectId: Found {len(groups_objectid)} groups")
    
    # Test with string
    groups_string = await db.db.student_groups.find({
        "program_id": program_id
    }).to_list(length=50)
    print(f"   Query with string: Found {len(groups_string)} groups")
    
    # Check the actual data type stored
    if groups:
        sample_group = groups[0]
        program_id_type = type(sample_group.get("program_id"))
        print(f"\n   Stored program_id type: {program_id_type}")
        print(f"   Stored program_id value: {sample_group.get('program_id')}")

if __name__ == "__main__":
    asyncio.run(test_student_groups())
