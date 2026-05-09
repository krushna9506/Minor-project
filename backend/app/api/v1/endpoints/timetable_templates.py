from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.user import User
from app.services.auth import get_current_active_user
from app.services.timetable.template_service import TemplateService
from bson import ObjectId

router = APIRouter()

@router.post("/generate-from-template")
async def generate_timetable_from_template(
    request: dict,
    current_user: User = Depends(get_current_active_user),
):
    """
    Generate a timetable from a template.
    
    Request body:
    {
        "program_id": "string",
        "semester": int,
        "academic_year": "string",
        "title": "string" (optional),
        "student_group_id": "string" (optional) - specific student group to generate for
    }
    """
    try:
        # Extract parameters
        program_id = request.get("program_id")
        semester = request.get("semester")
        academic_year = request.get("academic_year")
        title = request.get("title")
        student_group_id = request.get("student_group_id")  # Optional
        
        if not all([program_id, semester, academic_year]):
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: program_id, semester, academic_year"
            )
        
        # Validate program exists
        from app.db.mongodb import db
        program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        print(f"🔍 Looking for template: program={program_id}, semester={semester}")
        
        # Get or create template
        template = await TemplateService.get_template_by_program_semester(
            program_id=program_id,
            semester=semester
        )
        
        if not template:
            print(f"📝 No template found, creating default template...")
            template = await TemplateService.create_default_template(
                program_id=program_id,
                semester=semester,
                created_by=str(current_user.id)
            )
        else:
            print(f"✅ Found existing template: {template.get('template_name')}")
        
        # Generate title if not provided
        if not title:
            program_name = program.get("program_name", "Program")
            title = f"{program_name} - Semester {semester} - {academic_year}"
        
        # Apply template to create timetable
        print(f"🚀 Generating timetable from template...")
        timetable = await TemplateService.apply_template_to_timetable(
            template=template,
            program_id=program_id,
            semester=semester,
            academic_year=academic_year,
            title=title,
            created_by=str(current_user.id),
            student_group_id=student_group_id  # Pass the selected group
        )
        
        # Convert ObjectIds for response
        timetable = TemplateService.convert_objectids_to_strings(timetable)
        
        return {
            "success": True,
            "message": "Timetable generated successfully from template",
            "timetable": timetable,
            "template_used": {
                "id": str(template.get("_id")),
                "name": template.get("template_name"),
                "is_default": template.get("is_default", False)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating timetable from template: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating timetable from template: {str(e)}"
        )
