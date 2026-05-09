from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime

from ....services.auth import get_current_user
from ....db.mongodb import db
from ....models.faculty import Faculty, FacultyCreate, FacultyUpdate
from ....models.user import User

router = APIRouter()

@router.get("/")
async def get_faculty(current_user: User = Depends(get_current_user)):
    """
    Get all faculty members from the database (no restrictions).
    """
    try:
        # Return ALL faculty from database
        print("🔍 Fetching ALL faculty members from database")
        cursor = db.db.faculty.find({})
        faculty_list = []
        
        async for doc in cursor:
            # Convert ObjectId to string
            doc["_id"] = str(doc["_id"])
            doc["id"] = doc["_id"]  # Add id field
            # Convert all ObjectId fields to strings
            for key, value in doc.items():
                if isinstance(value, ObjectId):
                    doc[key] = str(value)
            faculty_list.append(doc)
        
        print(f"✅ Found {len(faculty_list)} faculty members")
        return faculty_list
    except Exception as e:
        print(f"❌ Error getting faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve faculty: {str(e)}"
        )

@router.post("/", response_model=Faculty)
async def create_faculty(
    faculty_data: FacultyCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new faculty member.
    """
    try:
        # Check if employee_id already exists for this user
        existing = await db.db.faculty.find_one({
            "employee_id": faculty_data.employee_id,
            "created_by": current_user.id
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Faculty with employee ID '{faculty_data.employee_id}' already exists"
            )
        
        # Create faculty document
        faculty_doc = {
            **faculty_data.dict(),
            "created_by": current_user.id,
            "created_at": datetime.utcnow(),
        }
        
        print(f"✅ Creating faculty: {faculty_doc}")
        
        # Insert into database
        result = await db.db.faculty.insert_one(faculty_doc)
        
        if not result.inserted_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create faculty member"
            )
        
        # Retrieve the created faculty
        created_faculty = await db.db.faculty.find_one({"_id": result.inserted_id})
        created_faculty["_id"] = str(created_faculty["_id"])
        created_faculty["id"] = created_faculty["_id"]  # Add explicit id field
        
        print(f"✅ Faculty created successfully: {created_faculty}")
        
        return Faculty(**created_faculty)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create faculty: {str(e)}"
        )

@router.get("/{faculty_id}", response_model=Faculty)
async def get_faculty_by_id(
    faculty_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific faculty member by ID.
    """
    try:
        if not ObjectId.is_valid(faculty_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid faculty ID format"
            )
        
        faculty = await db.db.faculty.find_one({
            "_id": ObjectId(faculty_id),
            "created_by": current_user.id
        })
        
        if not faculty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty member not found"
            )
        
        faculty["_id"] = str(faculty["_id"])
        faculty["id"] = faculty["_id"]  # Add explicit id field
        return Faculty(**faculty)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting faculty by ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve faculty: {str(e)}"
        )

@router.put("/{faculty_id}", response_model=Faculty)
async def update_faculty(
    faculty_id: str,
    faculty_update: FacultyUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a faculty member.
    """
    try:
        if not ObjectId.is_valid(faculty_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid faculty ID format"
            )
        
        # Check if faculty exists and belongs to current user
        existing_faculty = await db.db.faculty.find_one({
            "_id": ObjectId(faculty_id),
            "created_by": current_user.id
        })
        
        if not existing_faculty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty member not found"
            )
        
        # Prepare update data
        update_data = {k: v for k, v in faculty_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        # Check for duplicate employee_id if updating it
        if "employee_id" in update_data:
            duplicate = await db.db.faculty.find_one({
                "employee_id": update_data["employee_id"],
                "created_by": current_user.id,
                "_id": {"$ne": ObjectId(faculty_id)}
            })
            
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Faculty with employee ID '{update_data['employee_id']}' already exists"
                )
        
        update_data["updated_at"] = datetime.utcnow()
        
        print(f"✅ Updating faculty {faculty_id} with: {update_data}")
        
        # Update faculty
        result = await db.db.faculty.update_one(
            {"_id": ObjectId(faculty_id), "created_by": current_user.id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty member not found"
            )
        
        # Retrieve updated faculty
        updated_faculty = await db.db.faculty.find_one({"_id": ObjectId(faculty_id)})
        updated_faculty["_id"] = str(updated_faculty["_id"])
        updated_faculty["id"] = updated_faculty["_id"]  # Add explicit id field
        
        print(f"✅ Faculty updated successfully: {updated_faculty}")
        
        return Faculty(**updated_faculty)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update faculty: {str(e)}"
        )

@router.delete("/{faculty_id}")
async def delete_faculty(
    faculty_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a faculty member.
    """
    try:
        if not ObjectId.is_valid(faculty_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid faculty ID format"
            )
        
        print(f"🗑️ Deleting faculty {faculty_id} for user {current_user.id}")
        
        # Delete faculty
        result = await db.db.faculty.delete_one({
            "_id": ObjectId(faculty_id),
            "created_by": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty member not found"
            )
        
        print(f"✅ Faculty {faculty_id} deleted successfully")
        
        return {"message": "Faculty member deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete faculty: {str(e)}"
        )
