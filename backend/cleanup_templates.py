"""
Cleanup old templates and timetables to regenerate with correct time slots
"""
import asyncio
from app.db.mongodb import db, connect_to_mongo

async def cleanup_templates():
    print("🧹 Cleaning up old templates and timetables...\n")
    
    await connect_to_mongo()
    
    if db.db is None:
        print("❌ Failed to connect to database")
        return
    
    print("✅ Connected to database\n")
    
    # Delete all existing templates
    result = await db.db.timetable_templates.delete_many({})
    print(f"🗑️  Deleted {result.deleted_count} old templates")
    
    # Optionally delete old timetables (comment out if you want to keep them)
    # result2 = await db.db.timetables.delete_many({})
    # print(f"🗑️  Deleted {result2.deleted_count} old timetables")
    
    print("\n✅ Cleanup complete!")
    print("   New templates will be auto-created with correct time slots when you generate a timetable.")
    print("\n📝 Next steps:")
    print("   1. Restart the backend server")
    print("   2. Generate a new timetable")
    print("   3. Check browser console (F12) for debug logs")

if __name__ == "__main__":
    asyncio.run(cleanup_templates())
