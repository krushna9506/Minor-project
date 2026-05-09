from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.models.user import User
from app.models.timetable import Timetable, TimetableCreate, TimetableUpdate
from app.services.auth import get_current_active_user
from app.services.timetable.generator import TimetableGenerator
from app.services.timetable.advanced_generator import AdvancedTimetableGenerator
from app.services.timetable.exporter import TimetableExporter
from app.db.mongodb import db
from bson import ObjectId
import io
import datetime

router = APIRouter()

@router.get("/", response_model=List[Timetable])
async def get_timetables(
    skip: int = Query(0, ge=0, description="Number of timetables to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of timetables to return"),
    program_id: Optional[str] = Query(None, description="Filter by program ID"),
    semester: Optional[int] = Query(None, description="Filter by semester"),
    academic_year: Optional[str] = Query(None, description="Filter by academic year"),
    is_draft: Optional[bool] = Query(None, description="Filter by draft status"),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all timetables created by the current user with optional filtering.
    """
    # CRITICAL: Always filter by created_by to ensure user isolation
    if current_user.id == "demo":
        filter_query = {}
    else:
        filter_query = {"created_by": ObjectId(str(current_user.id))}

    if program_id:
        filter_query["program_id"] = ObjectId(program_id)
    if semester is not None:
        filter_query["semester"] = semester
    if academic_year:
        filter_query["academic_year"] = academic_year
    if is_draft is not None:
        filter_query["is_draft"] = is_draft
    
    print(f"🔒 SECURITY: Getting timetables for user {current_user.id} with filter: {filter_query}")
    
    timetables = await db.db.timetables.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
    
    print(f"🔒 SECURITY: Found {len(timetables)} timetables for user {current_user.id}")
    
    # Convert ObjectIds to strings for JSON serialization
    for timetable in timetables:
        # Convert _id to id for frontend compatibility
        timetable["id"] = str(timetable["_id"])
        del timetable["_id"]  # Remove the original _id field
        
        if "created_by" in timetable and timetable["created_by"]:
            timetable["created_by"] = str(timetable["created_by"])
        if "program_id" in timetable and timetable["program_id"]:
            timetable["program_id"] = str(timetable["program_id"])
        
        # Handle missing title field for old timetables
        if "title" not in timetable or not timetable["title"]:
            timetable["title"] = f"Timetable - {timetable.get('academic_year', 'Unknown')} Semester {timetable.get('semester', 'N/A')}"
        
        # Handle missing created_at field
        if "created_at" not in timetable or timetable["created_at"] is None:
            from datetime import datetime
            timetable["created_at"] = datetime.utcnow()
    
    return timetables

@router.get("/{timetable_id}", response_model=Timetable)
async def get_timetable(
    timetable_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific timetable by ID. Users can only access their own timetables.
    """
    print(f"🔒 SECURITY: User {current_user.id} requesting timetable {timetable_id}")
    
    # CRITICAL: Filter by both ID and created_by to ensure user isolation
    timetable = await db.db.timetables.find_one({
        "_id": ObjectId(timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    
    if not timetable:
        print(f"🔒 SECURITY: Timetable {timetable_id} not found or not accessible by user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    print(f"🔒 SECURITY: Successfully retrieved timetable {timetable_id} for user {current_user.id}")
    
    # Convert ObjectIds to strings for JSON serialization
    # Convert _id to id for frontend compatibility
    timetable["id"] = str(timetable["_id"])
    del timetable["_id"]  # Remove the original _id field
    
    if "created_by" in timetable and timetable["created_by"]:
        timetable["created_by"] = str(timetable["created_by"])
    if "program_id" in timetable and timetable["program_id"]:
        timetable["program_id"] = str(timetable["program_id"])
    
    # Handle missing title field for old timetables
    if "title" not in timetable or not timetable["title"]:
        timetable["title"] = f"Timetable - {timetable.get('academic_year', 'Unknown')} Semester {timetable.get('semester', 'N/A')}"
    
    # Handle missing created_at field
    if "created_at" not in timetable or timetable["created_at"] is None:
        from datetime import datetime
        timetable["created_at"] = datetime.utcnow()
    
    return timetable

@router.post("/", response_model=Timetable)
async def create_timetable(
    timetable_data: TimetableCreate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new empty timetable.
    """
    timetable_dict = timetable_data.dict()
    timetable_dict["created_by"] = ObjectId(str(current_user.id))
    # Convert program_id string to ObjectId for storage
    timetable_dict["program_id"] = ObjectId(timetable_dict["program_id"])
    timetable_dict["entries"] = timetable_dict.get("entries", [])
    # Default to final save unless explicitly marked as draft
    timetable_dict["is_draft"] = timetable_dict.get("is_draft", False)
    
    result = await db.db.timetables.insert_one(timetable_dict)
    timetable = await db.db.timetables.find_one({"_id": result.inserted_id})
    
    # Convert ObjectIds to strings for JSON serialization
    if timetable:
        # Convert _id to id for frontend compatibility
        timetable["id"] = str(timetable["_id"])
        del timetable["_id"]  # Remove the original _id field
        
        timetable["created_by"] = str(timetable["created_by"])
        if "program_id" in timetable and timetable["program_id"]:
            timetable["program_id"] = str(timetable["program_id"])
    
    return timetable

@router.post("/draft", response_model=Timetable)
async def save_draft_timetable(
    draft_data: dict,
    current_user: User = Depends(get_current_active_user),
):
    """
    Save or update a draft timetable with partial data.
    """
    try:
        # Extract timetable ID if updating existing draft
        timetable_id = draft_data.get('id')
        
        if timetable_id:
            # Update existing draft - CRITICAL: Ensure user owns this timetable
            print(f"🔒 SECURITY: User {current_user.id} updating timetable {timetable_id}")
            
            update_data = {
                **draft_data,
                "is_draft": True,
                "last_modified": draft_data.get('lastModified'),
                "modified_by": ObjectId(str(current_user.id))
            }
            # Remove ID from update data
            update_data.pop('id', None)
            
            if update_data.get('program_id') and isinstance(update_data['program_id'], str):
                update_data['program_id'] = ObjectId(update_data['program_id'])
            
            # CRITICAL: Filter by both ID and created_by to ensure user isolation
            result = await db.db.timetables.update_one(
                {
                    "_id": ObjectId(timetable_id),
                    "created_by": ObjectId(str(current_user.id))  # Ensure user owns this timetable
                },
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                print(f"🔒 SECURITY: Draft timetable {timetable_id} not found or not accessible by user {current_user.id}")
                raise HTTPException(status_code=404, detail="Draft timetable not found")
            
            updated_timetable = await db.db.timetables.find_one({
                "_id": ObjectId(timetable_id),
                "created_by": ObjectId(str(current_user.id))
            })
            if not updated_timetable:
                raise HTTPException(status_code=500, detail="Failed to retrieve updated draft")
            
            updated_timetable["id"] = str(updated_timetable["_id"])
            del updated_timetable["_id"]
            if "created_by" in updated_timetable and updated_timetable["created_by"]:
                updated_timetable["created_by"] = str(updated_timetable["created_by"])
            if "program_id" in updated_timetable and updated_timetable["program_id"]:
                updated_timetable["program_id"] = str(updated_timetable["program_id"])
            
            print(f"🔒 SECURITY: Successfully updated timetable {timetable_id} for user {current_user.id}")
            return updated_timetable
        else:
            # Create new draft
            draft_dict = {
                **draft_data,
                "created_by": ObjectId(str(current_user.id)),
                "created_at": draft_data.get('lastModified'),
                "is_draft": True,
                "validation_status": "pending",
                "entries": []
            }
            if draft_dict.get('program_id') and isinstance(draft_dict['program_id'], str):
                draft_dict['program_id'] = ObjectId(draft_dict['program_id'])
            
            result = await db.db.timetables.insert_one(draft_dict)
            created_timetable = await db.db.timetables.find_one({"_id": result.inserted_id})
            if not created_timetable:
                raise HTTPException(status_code=500, detail="Failed to retrieve created draft")
            
            created_timetable["id"] = str(created_timetable["_id"])
            del created_timetable["_id"]
            if "created_by" in created_timetable and created_timetable["created_by"]:
                created_timetable["created_by"] = str(created_timetable["created_by"])
            if "program_id" in created_timetable and created_timetable["program_id"]:
                created_timetable["program_id"] = str(created_timetable["program_id"])
            
            return created_timetable
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save draft: {str(e)}")

@router.post("/generate", response_model=Timetable)
async def generate_timetable(
    program_id: str,
    semester: int,
    academic_year: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Generate a new timetable using AI optimization.
    """
    try:
        # Check if program exists
        program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        # Create timetable generator
        generator = TimetableGenerator()
        
        # Generate timetable
        timetable = await generator.generate_timetable(
            program_id=program_id,
            semester=semester,
            academic_year=academic_year,
            created_by=str(current_user.id)
        )
        
        return timetable
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating timetable: {str(e)}")

@router.post("/generate-advanced")
async def generate_advanced_timetable(
    request: dict,
    current_user: User = Depends(get_current_active_user),
):
    """
    Generate a new timetable using template-based generation with smart slot allocation.
    Supports both theory and lab courses with proper time slot formatting.
    """
    try:
        # Extract parameters from request
        program_id = request.get("program_id")
        semester = request.get("semester")
        academic_year = request.get("academic_year")
        title = request.get("title", "AI Generated Timetable")
        student_group_id = request.get("student_group_id")  # Optional
        
        if not all([program_id, semester, academic_year]):
            raise HTTPException(
                status_code=400, 
                detail="Missing required fields: program_id, semester, academic_year"
            )
        
        # Check if program exists
        program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        print(f"🚀 Starting template-based timetable generation for program {program_id}")
        
        # Import template service
        from app.services.timetable.template_service import TemplateService
        
        rule_id = request.get("rule_id")
        
        # Get existing template
        template = await TemplateService.get_template_by_program_semester(
            program_id=program_id,
            semester=semester
        )
        
        # If a specific rule is selected, we MUST reconstruct the template to honor it.
        # Otherwise, if it was already made with old settings, it wouldn't update.
        if rule_id and template:
            await db.db.timetable_templates.delete_many({
                "program_id": ObjectId(program_id),
                "semester": semester
            })
            template = None
        
        if not template:
            print(f"📝 Creating template (Rule ID specific: {rule_id})...")
            template = await TemplateService.create_default_template(
                program_id=program_id,
                semester=semester,
                created_by=str(current_user.id),
                rule_id=rule_id
            )
        else:
            print(f"✅ Found existing template: {template.get('template_name')}")
        
        # Generate title if not provided
        if not title or title == "AI Generated Timetable":
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
            student_group_id=student_group_id,
            courses_override=request.get("courses"),
            student_groups_override=request.get("student_groups"),
            rooms_override=request.get("rooms"),
            faculty_override=request.get("faculty"),
        )
        
        # Convert ObjectIds for response
        timetable = TemplateService.convert_objectids_to_strings(timetable)
        
        return {
            "success": True,
            "message": "Timetable generated successfully from template",
            "timetable": timetable,
            "generation_details": {
                "score": 100,  # Placeholder
                "statistics": {
                    "total_sessions": len(timetable.get("entries", [])),
                    "theory_sessions": len([e for e in timetable.get("metadata", {}).get("schedule_details", []) if not e.get("is_lab")]),
                    "lab_sessions": len([e for e in timetable.get("metadata", {}).get("schedule_details", []) if e.get("is_lab")])
                },
                "validation": {"valid": True}
            },
            "template_used": {
                "id": str(template.get("_id")),
                "name": template.get("template_name"),
                "is_default": template.get("is_default", False)
            }
        }
        
    except Exception as e:
        print(f"❌ Error in timetable generation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating timetable: {str(e)}")

@router.post("/generate-nep-ga")
async def generate_nep_ga_timetable(
    request: dict,
    current_user: User = Depends(get_current_active_user),
):
    """
    Generate a new timetable using NEP 2020 compliant Genetic Algorithm.
    This uses the advanced NEPGAEngine for optimal scheduling with NEP compliance.
    """
    try:
        from app.services.timetable.nep_ga_engine import NEPGAEngine
        
        # Extract parameters
        program_id = request.get("program_id")
        semester = request.get("semester")
        academic_year = request.get("academic_year")
        title = request.get("title", "NEP Optimized Timetable")
        
        if not all([program_id, semester, academic_year]):
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: program_id, semester, academic_year"
            )
        
        # Check if program exists
        program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        print(f"🚀 Starting NEP GA timetable generation for program {program_id}")
        
        # Get data from database
        courses = await db.db.courses.find({
            "program_id": ObjectId(program_id),
            "semester": semester
        }).to_list(length=None)
        
        student_groups = await db.db.student_groups.find({
            "program_id": ObjectId(program_id)
        }).to_list(length=None)
        
        rooms = await db.db.rooms.find({"is_active": True}).to_list(length=None)
        faculty = await db.db.faculty.find({}).to_list(length=None)
        
        # Get constraints
        constraints = await db.db.constraints.find({
            "$or": [
                {"program_id": ObjectId(program_id)},
                {"program_id": None}
            ],
            "is_active": True
        }).to_list(length=None)
        
        # Get or create template
        from app.services.timetable.template_service import TemplateService
        template = await TemplateService.get_template_by_program_semester(
            program_id=program_id,
            semester=semester
        )
        
        if not template:
            template = await TemplateService.create_default_template(
                program_id=program_id,
                semester=semester,
                created_by=str(current_user.id)
            )
        
        # Create NEP GA Engine
        nep_preferences = request.get("nep_preferences", {})
        ga_engine = NEPGAEngine(
            courses=courses,
            student_groups=student_groups,
            rooms=rooms,
            all_faculty=faculty,
            template=template,
            constraints=constraints,
            nep_preferences=nep_preferences
        )
        
        # Run GA optimization
        pop_size = request.get("population_size", 60)
        max_generations = request.get("max_generations", 200)
        
        best_chromosome, best_fitness, message = ga_engine.run(
            pop_size=pop_size,
            max_generations=max_generations
        )
        
        if not best_chromosome:
            raise HTTPException(status_code=500, detail="Failed to generate timetable")
        
        # Convert to entries
        entries = ga_engine.chromosome_to_entries(best_chromosome)
        
        # Get NEP compliance report
        nep_report = ga_engine.get_nep_compliance_report(best_chromosome)
        
        # Generate title
        if not title or title == "NEP Optimized Timetable":
            program_name = program.get("name", "Program")
            title = f"{program_name} - Semester {semester} - {academic_year} (NEP Optimized)"
        
        # Create timetable document
        timetable_data = {
            "title": title,
            "program_id": ObjectId(program_id),
            "semester": semester,
            "academic_year": academic_year,
            "created_by": ObjectId(str(current_user.id)),
            "created_at": datetime.datetime.utcnow(),
            "is_draft": False,
            "validation_status": "generated",
            "entries": entries,
            "optimization_score": best_fitness,
            "metadata": {
                "generation_method": "nep_ga",
                "nep_compliance_score": nep_report.get("overall_score", 0),
                "nep_report": nep_report,
                "ga_stats": {
                    "generations": ga_engine.generation_count,
                    "population_size": pop_size,
                    "final_fitness": best_fitness
                }
            }
        }
        
        # Save to database
        result = await db.db.timetables.insert_one(timetable_data)
        
        # Return response
        return {
            "success": True,
            "message": message,
            "timetable": {
                "id": str(result.inserted_id),
                "title": title,
                "program_id": program_id,
                "semester": semester,
                "academic_year": academic_year,
                "entries": entries,
                "optimization_score": best_fitness,
                "nep_compliance": nep_report
            },
            "generation_details": {
                "method": "NEP Genetic Algorithm",
                "fitness_score": best_fitness,
                "generations": ga_engine.generation_count,
                "nep_compliance_score": nep_report.get("overall_score", 0),
                "statistics": {
                    "total_sessions": len(entries),
                    "theory_sessions": len([e for e in entries if not e.get("is_lab")]),
                    "lab_sessions": len([e for e in entries if e.get("is_lab")])
                }
            }
        }
        
    except Exception as e:
        print(f"❌ Error in NEP GA timetable generation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating NEP timetable: {str(e)}")

@router.put("/{timetable_id}", response_model=Timetable)
async def update_timetable(
    timetable_id: str,
    timetable_data: TimetableUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update a timetable. Users can only update their own timetables.
    """
    print(f"🔒 SECURITY: User {current_user.id} updating timetable {timetable_id}")
    
    # CRITICAL: Check if timetable exists AND belongs to current user
    timetable = await db.db.timetables.find_one({
        "_id": ObjectId(timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    if not timetable:
        print(f"🔒 SECURITY: Timetable {timetable_id} not found or not accessible by user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    # Update timetable
    update_data = {k: v for k, v in timetable_data.dict().items() if v is not None}
    if update_data:
        # CRITICAL: Filter by both ID and created_by to ensure user isolation
        await db.db.timetables.update_one(
            {
                "_id": ObjectId(timetable_id),
                "created_by": ObjectId(str(current_user.id))
            }, 
            {"$set": update_data}
        )
    
    updated_timetable = await db.db.timetables.find_one({
        "_id": ObjectId(timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    
    print(f"🔒 SECURITY: Successfully updated timetable {timetable_id} for user {current_user.id}")
    
    # Convert ObjectIds to strings for JSON serialization
    if updated_timetable:
        # Convert _id to id for frontend compatibility
        updated_timetable["id"] = str(updated_timetable["_id"])
        del updated_timetable["_id"]  # Remove the original _id field
        
        if "created_by" in updated_timetable and updated_timetable["created_by"]:
            updated_timetable["created_by"] = str(updated_timetable["created_by"])
        if "program_id" in updated_timetable and updated_timetable["program_id"]:
            updated_timetable["program_id"] = str(updated_timetable["program_id"])
    
    return updated_timetable

@router.delete("/{timetable_id}")
async def delete_timetable(
    timetable_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a timetable. Users can only delete their own timetables.
    """
    print(f"🔒 SECURITY: User {current_user.id} deleting timetable {timetable_id}")
    
    # CRITICAL: Check if timetable exists AND belongs to current user
    timetable = await db.db.timetables.find_one({
        "_id": ObjectId(timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    if not timetable:
        print(f"🔒 SECURITY: Timetable {timetable_id} not found or not accessible by user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    # CRITICAL: Delete with user isolation
    result = await db.db.timetables.delete_one({
        "_id": ObjectId(timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    
    if result.deleted_count == 0:
        print(f"🔒 SECURITY: Failed to delete timetable {timetable_id} for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    print(f"🔒 SECURITY: Successfully deleted timetable {timetable_id} for user {current_user.id}")
    return {"message": "Timetable deleted successfully"}

@router.get("/{timetable_id}/export/{format_type}")
async def export_timetable_endpoint(
    timetable_id: str,
    format_type: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Export a timetable in the specified format (excel, pdf, json). Users can only export their own timetables.
    """
    print(f"🔒 SECURITY: User {current_user.id} exporting timetable {timetable_id}")
    
    # CRITICAL: Check if timetable exists AND belongs to current user
    timetable = await db.db.timetables.find_one({
        "_id": ObjectId(timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    if not timetable:
        print(f"🔒 SECURITY: Timetable {timetable_id} not found or not accessible by user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    # Export timetable
    try:
        format_type = format_type.lower()
        exporter = TimetableExporter()
        
        if format_type == "json":
            result = await exporter.export_timetable(timetable_id, format_type)
            return result
        
        elif format_type == "excel":
            excel_data = await exporter.export_timetable(timetable_id, format_type)
            
            # Create response with appropriate headers
            return StreamingResponse(
                excel_data,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=timetable_{timetable_id}.xlsx"}
            )
        
        elif format_type == "pdf":
            pdf_data = await exporter.export_timetable(timetable_id, format_type)
            
            # Check if we got HTML (when WeasyPrint is not available) or PDF
            try:
                # Try to decode as UTF-8 to determine if it's HTML
                html_test = pdf_data.decode('utf-8')
                # If it doesn't raise, it's HTML
                return StreamingResponse(
                    io.BytesIO(pdf_data),
                    media_type="text/html",
                    headers={"Content-Disposition": f"attachment; filename=timetable_{timetable_id}.html"}
                )
            except UnicodeDecodeError:
                # If it raises, it's PDF
                return StreamingResponse(
                    io.BytesIO(pdf_data),
                    media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=timetable_{timetable_id}.pdf"}
                )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format_type}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting timetable: {str(e)}")

@router.post("/{timetable_id}/optimize")
async def optimize_timetable(
    timetable_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Optimize an existing timetable using AI.
    """
    # Check if timetable exists
    timetable = await db.db.timetables.find_one({"_id": ObjectId(timetable_id)})
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    try:
        generator = TimetableGenerator()
        optimized_timetable = await generator.optimize_timetable(timetable_id)
        return optimized_timetable
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error optimizing timetable: {str(e)}")

@router.post("/{timetable_id}/validate")
async def validate_timetable(
    timetable_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Validate a timetable against constraints.
    """
    # Check if timetable exists
    timetable = await db.db.timetables.find_one({"_id": ObjectId(timetable_id)})
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    try:
        generator = TimetableGenerator()
        validation_result = await generator.validate_timetable(timetable_id)
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating timetable: {str(e)}")
