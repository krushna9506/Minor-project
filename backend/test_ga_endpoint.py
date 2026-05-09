import asyncio
import os
import sys

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.mongodb import db, connect_to_mongo
from app.services.timetable.template_service import TemplateService
import datetime
from bson import ObjectId

async def test_ga():
    print("Connecting to DB...")
    await connect_to_mongo()
    
    # Grab the first template
    templates = await db.db.timetable_templates.find({}).to_list(length=1)
    if not templates:
        print("No templates found!")
        return
        
    template = templates[0]
    program_id = str(template["program_id"])
    semester = template.get("semester", 1)
    
    print(f"Testing generation for Program {program_id}, Sem {semester}")
    
    result = await TemplateService.apply_template_to_timetable(
        template=template,
        program_id=program_id,
        semester=semester,
        academic_year="202X",
        title="Test GA Gen",
        created_by="demo"
    )
    
    print("GA Run Complete!")
    print(f"Resulting entries: {len(result['entries'])}")
    print(f"Metadata GA stats: {result['metadata'].get('total_entries')}")

if __name__ == "__main__":
    asyncio.run(test_ga())
