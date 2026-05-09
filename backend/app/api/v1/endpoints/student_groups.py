from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from ....services.auth import get_current_user
from ....db.mongodb import db
from ....models.student_group import StudentGroup, StudentGroupCreate, StudentGroupUpdate
from ....models.user import User

router = APIRouter()

@router.get("/")
async def get_student_groups(
    program_id: Optional[str] = Query(None, description="Filter by program ID (optional)"),
    current_user: User = Depends(get_current_user)
):
    """
    Get all student groups from the database (returns all by default, optionally filtered by program).
    """
    try:
        # Build query filter - return ALL groups by default
        query_filter = {}
        
        # Optional filter - only apply if explicitly provided
        if program_id:
            # Support both stored ObjectId and string program_id values
            filters = [{"program_id": program_id}]
            try:
                filters.append({"program_id": ObjectId(program_id)})
            except Exception:
                pass
            query_filter["$or"] = filters
        
        print(f"🔍 Querying student groups with filter: {query_filter} (empty filter = ALL groups)")
        
        cursor = db.db.student_groups.find(query_filter)
        groups_list = []
        
        async for doc in cursor:
            # Convert ObjectId to string
            doc["_id"] = str(doc["_id"])
            doc["id"] = doc["_id"]  # Add id field for frontend compatibility
            # Convert all ObjectId fields to strings
            for key, value in doc.items():
                if isinstance(value, ObjectId):
                    doc[key] = str(value)
            groups_list.append(doc)
        
        print(f"✅ Found {len(groups_list)} student groups")
        return groups_list
    except Exception as e:
        print(f"❌ Error getting student groups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve student groups: {str(e)}"
        )

@router.post("/", response_model=StudentGroup)
async def create_student_group(
    group_data: StudentGroupCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new student group.
    """
    try:
        # Check if a group with the same name already exists for this user and program
        existing = await db.db.student_groups.find_one({
            "name": group_data.name,
            "program_id": group_data.program_id,
            "created_by": current_user.id
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A student group with this name already exists for this program"
            )
        
        # Validate that the courses exist
        for course_id in group_data.course_ids:
            try:
                ObjectId(course_id)  # Validate ObjectId format
                course = await db.db.courses.find_one({"_id": ObjectId(course_id)})
                if not course:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Course with ID {course_id} not found"
                    )
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid course ID format: {course_id}"
                )
        
        # Validate that the program exists
        try:
            ObjectId(group_data.program_id)  # Validate ObjectId format
            program = await db.db.programs.find_one({"_id": ObjectId(group_data.program_id)})
            if not program:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Program with ID {group_data.program_id} not found"
                )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid program ID format: {group_data.program_id}"
            )
        
        # Create the group document
        group_doc = {
            **group_data.model_dump(),
            "created_by": current_user.id,
            "created_at": datetime.utcnow(),
            "updated_at": None
        }
        
        # Insert into database
        result = await db.db.student_groups.insert_one(group_doc)
        
        # Retrieve the created group
        created_group = await db.db.student_groups.find_one({"_id": result.inserted_id})
        created_group["_id"] = str(created_group["_id"])
        created_group["id"] = created_group["_id"]
        
        return StudentGroup(**created_group)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating student group: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create student group: {str(e)}"
        )

@router.get("/{group_id}", response_model=StudentGroup)
async def get_student_group(
    group_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific student group by ID.
    """
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(group_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid group ID format"
            )
        
        group = await db.db.student_groups.find_one({
            "_id": ObjectId(group_id),
            "created_by": current_user.id
        })
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student group not found"
            )
        
        # Convert ObjectId to string
        group["_id"] = str(group["_id"])
        group["id"] = group["_id"]
        
        return StudentGroup(**group)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting student group: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve student group: {str(e)}"
        )

@router.put("/{group_id}", response_model=StudentGroup)
async def update_student_group(
    group_id: str,
    group_data: StudentGroupUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a student group.
    """
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(group_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid group ID format"
            )
        
        # Check if group exists and belongs to current user
        existing_group = await db.db.student_groups.find_one({
            "_id": ObjectId(group_id),
            "created_by": current_user.id
        })
        
        if not existing_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student group not found"
            )
        
        # Prepare update data (only include non-None fields)
        update_data = {k: v for k, v in group_data.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields provided for update"
            )
        
        # If updating course_ids, validate that the courses exist
        if "course_ids" in update_data:
            for course_id in update_data["course_ids"]:
                try:
                    ObjectId(course_id)  # Validate ObjectId format
                    course = await db.db.courses.find_one({"_id": ObjectId(course_id)})
                    if not course:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Course with ID {course_id} not found"
                        )
                except Exception:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid course ID format: {course_id}"
                    )
        
        # If updating program_id, validate that the program exists
        if "program_id" in update_data:
            try:
                ObjectId(update_data["program_id"])  # Validate ObjectId format
                program = await db.db.programs.find_one({"_id": ObjectId(update_data["program_id"])})
                if not program:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Program with ID {update_data['program_id']} not found"
                    )
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid program ID format: {update_data['program_id']}"
                )
        
        # Check for duplicate name (if name is being updated)
        if "name" in update_data:
            program_id = update_data.get("program_id", existing_group["program_id"])
            duplicate = await db.db.student_groups.find_one({
                "name": update_data["name"],
                "program_id": program_id,
                "created_by": current_user.id,
                "_id": {"$ne": ObjectId(group_id)}
            })
            
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A student group with this name already exists for this program"
                )
        
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        # Update the group
        await db.db.student_groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$set": update_data}
        )
        
        # Retrieve the updated group
        updated_group = await db.db.student_groups.find_one({"_id": ObjectId(group_id)})
        updated_group["_id"] = str(updated_group["_id"])
        updated_group["id"] = updated_group["_id"]
        
        return StudentGroup(**updated_group)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating student group: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update student group: {str(e)}"
        )

@router.delete("/{group_id}")
async def delete_student_group(
    group_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a student group.
    """
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(group_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid group ID format"
            )
        
        # Check if group exists and belongs to current user
        existing_group = await db.db.student_groups.find_one({
            "_id": ObjectId(group_id),
            "created_by": current_user.id
        })
        
        if not existing_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student group not found"
            )
        
        # Delete the group
        result = await db.db.student_groups.delete_one({
            "_id": ObjectId(group_id),
            "created_by": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student group not found"
            )
        
        return {"message": "Student group deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting student group: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete student group: {str(e)}"
        )

@router.get("/program/{program_id}/available-years", response_model=List[int])
async def get_available_years_for_program(
    program_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get available years for a specific program.
    """
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(program_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid program ID format"
            )
        
        program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
        
        if not program:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Program not found"
            )
        
        # Return years based on program duration (1, 2, 3, 4)
        duration_years = program.get("duration_years", 4)
        return list(range(1, duration_years + 1))
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting available years: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available years: {str(e)}"
        )
