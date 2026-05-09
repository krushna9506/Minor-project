from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.user import User
from app.models.program import Program, ProgramCreate, ProgramUpdate
from app.services.auth import get_current_active_user
from app.db.mongodb import db
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter()

@router.get("/", response_model=List[Program])
async def get_programs(
    skip: int = Query(0, ge=0, description="Number of programs to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of programs to return"),
    program_type: Optional[str] = Query(None, description="Filter by program type (optional)"),
    department: Optional[str] = Query(None, description="Filter by department (optional)"),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all academic programs (returns ALL by default, optional filters available).
    """
    print('get_programs endpoint hit')
    filter_query = {}
    if program_type:
        filter_query["type"] = program_type
    if department:
        filter_query["department"] = department
    
    try:
        if db.db is None:
            raise HTTPException(status_code=503, detail="Database unavailable")

        print(f"🔍 Fetching programs with filter: {filter_query} (empty = ALL programs)")
        programs = await db.db.programs.find(filter_query).skip(skip).limit(limit).to_list(length=limit)

        print(f"Found {len(programs)} programs in database")
        if programs:
            print(f"First program before conversion: {programs[0]}")

        # Convert ObjectId to string for each program and fill defaults for response_model
        for program in programs:
            if "_id" in program:
                program["id"] = str(program["_id"])
                del program["_id"]

            # Ensure required fields exist for Program model
            program.setdefault("type", "")
            program.setdefault("department", "")
            program.setdefault("duration_years", 0)
            program.setdefault("total_semesters", 0)
            program.setdefault("credits_required", 0)
            program.setdefault("description", "")
            program.setdefault("is_active", False)

        if programs:
            print(f"First program after conversion: {programs[0]}")

        return programs
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch programs: {str(e)}")

def parse_object_id(object_id: str) -> ObjectId:
    try:
        return ObjectId(object_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid ObjectId: {object_id}")


@router.get("/{program_id}", response_model=Program)
async def get_program(
    program_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific program by ID.
    """
    program = await db.db.programs.find_one({"_id": parse_object_id(program_id)})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Convert ObjectId to string
    if "_id" in program:
        program["id"] = str(program["_id"])
        del program["_id"]

    # Ensure required fields exist for Program model
    program.setdefault("type", "")
    program.setdefault("department", "")
    program.setdefault("duration_years", 0)
    program.setdefault("total_semesters", 0)
    program.setdefault("credits_required", 0)
    program.setdefault("description", "")
    program.setdefault("is_active", False)

    return program

@router.post("/", response_model=Program)
async def create_program(
    program_data: ProgramCreate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new academic program.
    Only admins can create programs.
    """
    # Debug logging
    print(f"📝 Creating program - User: {current_user.email}, Is Admin: {current_user.is_admin}")
    print(f"📝 Program data received: {program_data.model_dump()}")
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if program with same code already exists
    existing_program = await db.db.programs.find_one({"code": program_data.code})
    if existing_program:
        print(f"❌ Program code '{program_data.code}' already exists")
        raise HTTPException(status_code=400, detail="Program with this code already exists")
    
    try:
        program_dict = program_data.model_dump()
        print(f"📝 Inserting program dict: {program_dict}")
        result = await db.db.programs.insert_one(program_dict)
        
        # Retrieve the created program and convert ObjectId to string
        program_doc = await db.db.programs.find_one({"_id": result.inserted_id})
        if program_doc:
            # Convert ObjectId to string for the response
            program_doc["id"] = str(program_doc["_id"])
            del program_doc["_id"]  # Remove the original _id field
            
        print(f"✅ Program created successfully with ID: {result.inserted_id}")
        return program_doc
    except Exception as e:
        print(f"❌ Error creating program: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create program: {str(e)}")

@router.put("/{program_id}", response_model=Program)
async def update_program(
    program_id: str,
    program_data: ProgramUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update a program.
    Only admins can update programs.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if program exists
    program = await db.db.programs.find_one({"_id": parse_object_id(program_id)})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Update program
    update_data = {k: v for k, v in program_data.model_dump().items() if v is not None}
    if update_data:
        await db.db.programs.update_one({"_id": ObjectId(program_id)}, {"$set": update_data})
    
    updated_program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
    
    # Convert ObjectId to string
    if updated_program and "_id" in updated_program:
        updated_program["id"] = str(updated_program["_id"])
        del updated_program["_id"]
    
    return updated_program

@router.delete("/{program_id}")
async def delete_program(
    program_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a program.
    Only admins can delete programs.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if program exists
    program = await db.db.programs.find_one({"_id": parse_object_id(program_id)})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Check if program has associated timetables
    timetables = await db.db.timetables.find_one({"program_id": parse_object_id(program_id)})
    if timetables:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete program with associated timetables"
        )
    
    # Delete program
    await db.db.programs.delete_one({"_id": ObjectId(program_id)})
    return {"message": "Program deleted successfully"}

@router.get("/{program_id}/courses")
async def get_program_courses(
    program_id: str,
    semester: Optional[int] = Query(None, description="Filter by semester"),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all courses for a specific program from the database.
    """
    try:
        # Check if program exists
        program = await db.db.programs.find_one({"_id": parse_object_id(program_id)})
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        # Build filter query for courses - support ObjectId or string program_id stored in courses
        filter_query = {}
        try:
            course_id_value = parse_object_id(program_id)
            filter_query["$or"] = [{"program_id": course_id_value}, {"program_id": program_id}]
        except HTTPException:
            filter_query["program_id"] = program_id

        if semester is not None:
            filter_query["semester"] = semester
        
        print(f"🔍 Looking for courses with filter: {filter_query}")
        
        # Query courses from database
        courses = await db.db.courses.find(filter_query).to_list(length=None)
        
        print(f"📚 Found {len(courses)} courses in database")
        
        # Convert ObjectId to string for JSON serialization
        for course in courses:
            if "_id" in course:
                course["id"] = str(course["_id"])
                del course["_id"]
            if "program_id" in course and isinstance(course["program_id"], ObjectId):
                course["program_id"] = str(course["program_id"])
        
        return courses
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_program_courses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get program courses: {str(e)}")

@router.get("/{program_id}/statistics")
async def get_program_statistics(
    program_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get statistics for a specific program.
    """
    # Check if program exists
    program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Get program statistics
    program_obj = parse_object_id(program_id)
    total_courses = await db.db.courses.count_documents({"program_id": program_obj})
    total_timetables = await db.db.timetables.count_documents({"program_id": program_obj})
    
    # Get semester-wise course count
    semester_pipeline = [
        {"$match": {"program_id": program_obj}},
        {"$group": {"_id": "$semester", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    semester_stats = await db.db.courses.aggregate(semester_pipeline).to_list(length=None)
    
    # Convert ObjectId to string for program_info
    if program and "_id" in program:
        program["id"] = str(program["_id"])
        del program["_id"]
    
    return {
        "program_id": program_id,
        "total_courses": total_courses,
        "total_timetables": total_timetables,
        "courses_by_semester": semester_stats,
        "program_info": program
    }
