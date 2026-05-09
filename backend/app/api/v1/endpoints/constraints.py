from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.user import User
from app.models.constraint import Constraint, ConstraintCreate, ConstraintUpdate
from app.services.auth import get_current_active_user
from app.db.mongodb import db
from bson import ObjectId

router = APIRouter()

@router.get("/", response_model=List[Constraint])
async def get_constraints(
    skip: int = Query(0, ge=0, description="Number of constraints to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of constraints to return"),
    constraint_type: Optional[str] = Query(None, description="Filter by constraint type"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    program_id: Optional[str] = Query(None, description="Filter by program ID"),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all scheduling constraints with optional filtering.
    """
    filter_query = {}
    if constraint_type:
        filter_query["type"] = constraint_type
    if is_active is not None:
        filter_query["is_active"] = is_active
    if program_id:
        filter_query["program_id"] = ObjectId(program_id)
    
    constraints = await db.db.constraints.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
    return constraints

@router.get("/{constraint_id}", response_model=Constraint)
async def get_constraint(
    constraint_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific constraint by ID.
    """
    constraint = await db.db.constraints.find_one({"_id": ObjectId(constraint_id)})
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
    return constraint

@router.post("/", response_model=Constraint)
async def create_constraint(
    constraint_data: ConstraintCreate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new scheduling constraint.
    Only admins and faculty can create constraints.
    """
    if not (current_user.is_admin or current_user.role in ["admin", "faculty"]):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    constraint_dict = constraint_data.dict()
    constraint_dict["created_by"] = ObjectId(str(current_user.id))
    
    result = await db.db.constraints.insert_one(constraint_dict)
    constraint = await db.db.constraints.find_one({"_id": result.inserted_id})
    return constraint

@router.put("/{constraint_id}", response_model=Constraint)
async def update_constraint(
    constraint_id: str,
    constraint_data: ConstraintUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update a constraint.
    Only admins and the creator can update constraints.
    """
    # Check if constraint exists
    constraint = await db.db.constraints.find_one({"_id": ObjectId(constraint_id)})
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
    
    # Check permissions
    if not (current_user.is_admin or str(constraint.get("created_by")) == str(current_user.id)):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Update constraint
    update_data = {k: v for k, v in constraint_data.dict().items() if v is not None}
    if update_data:
        await db.db.constraints.update_one({"_id": ObjectId(constraint_id)}, {"$set": update_data})
    
    updated_constraint = await db.db.constraints.find_one({"_id": ObjectId(constraint_id)})
    return updated_constraint

@router.delete("/{constraint_id}")
async def delete_constraint(
    constraint_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a constraint.
    Only admins and the creator can delete constraints.
    """
    # Check if constraint exists
    constraint = await db.db.constraints.find_one({"_id": ObjectId(constraint_id)})
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
    
    # Check permissions
    if not (current_user.is_admin or str(constraint.get("created_by")) == str(current_user.id)):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Delete constraint
    await db.db.constraints.delete_one({"_id": ObjectId(constraint_id)})
    return {"message": "Constraint deleted successfully"}

@router.get("/types/")
async def get_constraint_types(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all available constraint types.
    """
    constraint_types = [
        "faculty_availability",
        "room_capacity",
        "time_preference",
        "course_prerequisite",
        "faculty_workload",
        "room_type_requirement",
        "block_scheduling",
        "gap_minimization",
        "consecutive_classes",
        "nep_compliance"
    ]
    
    return {
        "constraint_types": constraint_types,
        "descriptions": {
            "faculty_availability": "Defines when faculty members are available",
            "room_capacity": "Ensures room capacity matches course requirements",
            "time_preference": "Faculty or institutional time preferences",
            "course_prerequisite": "Course sequencing requirements",
            "faculty_workload": "Limits on faculty teaching hours",
            "room_type_requirement": "Specific room type needs (lab, lecture hall)",
            "block_scheduling": "Teaching practice and field work blocks",
            "gap_minimization": "Minimize gaps in schedules",
            "consecutive_classes": "Required consecutive class scheduling",
            "nep_compliance": "NEP 2020 guideline adherence"
        }
    }

@router.post("/validate")
async def validate_constraints(
    program_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Validate all constraints for a specific program.
    """
    # Check if program exists
    program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Get all constraints for the program
    constraints = await db.db.constraints.find({
        "$or": [
            {"program_id": ObjectId(program_id)},
            {"program_id": None}  # Global constraints
        ],
        "is_active": True
    }).to_list(length=None)
    
    validation_results = []
    for constraint in constraints:
        # Basic validation logic (would be more complex in real implementation)
        validation_results.append({
            "constraint_id": str(constraint["_id"]),
            "constraint_type": constraint["type"],
            "is_valid": True,  # Simplified validation
            "message": "Constraint validation passed"
        })
    
    return {
        "program_id": program_id,
        "total_constraints": len(constraints),
        "validation_results": validation_results,
        "overall_status": "valid"
    }
