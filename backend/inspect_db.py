import asyncio
from app.db.mongodb import connect_to_mongo, db

async def main():
    await connect_to_mongo()
    courses = await db.db.courses.find().to_list(100)
    
    with open("db_output.txt", "w") as f:
        f.write("COURSES:\n")
        for c in courses:
            f.write(f" - {c.get('course_name') or c.get('name')}: faculty_id={c.get('faculty_id')} | faculty_name={c.get('faculty_name')} | course_id={c.get('_id')}\n")
        
        templates = await db.db.timetable_templates.find().to_list(100)
        f.write("\nTEMPLATES:\n")
        for t in templates:
            f.write(f" - ID: {t['_id']} | Name: {t.get('template_name')} | Active: {t.get('is_active')} | Pgm: {t.get('program_id')}\n")
            
        faculty = await db.db.faculty.find().to_list(100)
        f.write("\nFACULTY:\n")
        for t in faculty:
            f.write(f" - ID: {t['_id']} | Name: {t.get('name')}\n")

if __name__ == "__main__":
    asyncio.run(main())
