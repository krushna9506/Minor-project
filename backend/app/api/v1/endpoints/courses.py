from typing import List, Optional
from fastapi import APIRouter, Query, Depends, HTTPException, status
from app.services.auth import get_current_active_user
from app.models.user import User
from app.models.course import Course, CourseCreate, CourseUpdate
from app.db.mongodb import db
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.get("/")
async def get_courses(
    program_id: Optional[str] = Query(None, description="Filter by program ID (optional)"),
    semester: Optional[int] = Query(None, description="Filter by semester (optional)"),
    current_user: User = Depends(get_current_active_user),
):
    """Get all courses from the database (returns all courses by default, optionally filtered)"""
    try:
        # Build filter query - return ALL courses by default
        filter_query = {}
        
        # Optional filters - only apply if explicitly provided
        if program_id:
            try:
                prog_obj = ObjectId(program_id)
                filter_query["$or"] = [{"program_id": prog_obj}, {"program_id": program_id}]
            except Exception:
                filter_query["program_id"] = program_id
        
        if semester is not None:
            filter_query["semester"] = semester
        
        print(f"🔍 Querying courses with filter: {filter_query} (empty filter = ALL courses)")
        
        # Query the database
        courses = await db.db.courses.find(filter_query).to_list(length=None)
        
        print(f"📚 Found {len(courses)} courses in database")
        
        # Convert ObjectId to string for JSON serialization
        for course in courses:
            if "_id" in course:
                course["id"] = str(course["_id"])
                del course["_id"]
            # Convert all ObjectId fields to strings
            for key, value in course.items():
                if isinstance(value, ObjectId):
                    course[key] = str(value)
        
        return courses
        
    except Exception as e:
        print(f"❌ Error querying courses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch courses: {str(e)}")


@router.post("/", response_model=dict)
async def create_course(
    course: CourseCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new course"""
    try:
        print(f"🚀 Creating course: {course.dict()}")
        
        # Check if course code already exists
        existing_course = await db.db.courses.find_one({"code": course.code})
        if existing_course:
            print(f"❌ Course code {course.code} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course with code '{course.code}' already exists"
            )
        
        # Convert course to dict and prepare for insertion
        course_dict = course.dict()
        course_dict["created_by"] = str(current_user.id)
        course_dict["created_at"] = datetime.utcnow()
        course_dict["updated_at"] = None
        
        # Convert program_id to ObjectId if provided
        if course_dict.get("program_id"):
            try:
                course_dict["program_id"] = ObjectId(course_dict["program_id"])
            except Exception as e:
                print(f"❌ Invalid program_id format: {course_dict['program_id']}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid program_id format"
                )
        
        # Insert the course
        result = await db.db.courses.insert_one(course_dict)
        
        if result.inserted_id:
            # Fetch the created course
            created_course = await db.db.courses.find_one({"_id": result.inserted_id})
            
            # Convert ObjectIds to strings for JSON response
            if "_id" in created_course:
                created_course["id"] = str(created_course["_id"])
                del created_course["_id"]
            if "program_id" in created_course and isinstance(created_course["program_id"], ObjectId):
                created_course["program_id"] = str(created_course["program_id"])
            if "created_by" in created_course:
                created_course["created_by"] = str(created_course["created_by"])
            
            print(f"✅ Course created successfully with ID: {created_course['id']}")
            return created_course
        else:
            print("❌ Failed to insert course into database")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create course"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating course: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create course: {str(e)}"
        )


@router.put("/{course_id}", response_model=dict)
async def update_course(
    course_id: str,
    course_update: CourseUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update a course"""
    try:
        print(f"🔄 Updating course {course_id} with: {course_update.dict(exclude_unset=True)}")
        
        # Validate course_id format
        try:
            obj_id = ObjectId(course_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid course ID format"
            )
        
        # Check if course exists
        existing_course = await db.db.courses.find_one({"_id": obj_id})
        if not existing_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Prepare update data
        update_data = course_update.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # Convert program_id to ObjectId if provided
            if "program_id" in update_data and update_data["program_id"]:
                try:
                    update_data["program_id"] = ObjectId(update_data["program_id"])
                except Exception:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid program_id format"
                    )
            
            # Check if code is being changed and if it already exists
            if "code" in update_data and update_data["code"] != existing_course["code"]:
                code_exists = await db.db.courses.find_one({
                    "code": update_data["code"],
                    "_id": {"$ne": obj_id}
                })
                if code_exists:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Course with code '{update_data['code']}' already exists"
                    )
            
            # Update the course
            result = await db.db.courses.update_one(
                {"_id": obj_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                # Fetch updated course
                updated_course = await db.db.courses.find_one({"_id": obj_id})
                
                # Convert ObjectIds to strings
                if "_id" in updated_course:
                    updated_course["id"] = str(updated_course["_id"])
                    del updated_course["_id"]
                if "program_id" in updated_course and isinstance(updated_course["program_id"], ObjectId):
                    updated_course["program_id"] = str(updated_course["program_id"])
                if "created_by" in updated_course:
                    updated_course["created_by"] = str(updated_course["created_by"])
                
                print(f"✅ Course updated successfully")
                return updated_course
            else:
                print("⚠️ No changes made to course")
                # Return current course even if no changes
                existing_course["id"] = str(existing_course["_id"])
                del existing_course["_id"]
                if "program_id" in existing_course and isinstance(existing_course["program_id"], ObjectId):
                    existing_course["program_id"] = str(existing_course["program_id"])
                if "created_by" in existing_course:
                    existing_course["created_by"] = str(existing_course["created_by"])
                return existing_course
        else:
            # No update data provided, return existing course
            existing_course["id"] = str(existing_course["_id"])
            del existing_course["_id"]
            if "program_id" in existing_course and isinstance(existing_course["program_id"], ObjectId):
                existing_course["program_id"] = str(existing_course["program_id"])
            if "created_by" in existing_course:
                existing_course["created_by"] = str(existing_course["created_by"])
            return existing_course
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating course: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update course: {str(e)}"
        )


@router.delete("/{course_id}")
async def delete_course(
    course_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a course"""
    try:
        print(f"🗑️ Deleting course {course_id}")
        
        # Validate course_id format
        try:
            obj_id = ObjectId(course_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid course ID format"
            )
        
        # Check if course exists
        existing_course = await db.db.courses.find_one({"_id": obj_id})
        if not existing_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Delete the course
        result = await db.db.courses.delete_one({"_id": obj_id})
        
        if result.deleted_count > 0:
            print(f"✅ Course deleted successfully")
            return {"message": "Course deleted successfully", "id": course_id}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete course"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting course: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete course: {str(e)}"
        )
