from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User, UserCreate, UserUpdate
from app.services.auth import get_current_active_user
from app.db.mongodb import db
from bson import ObjectId

router = APIRouter()

@router.get("/", response_model=List[User])
async def get_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of users to return"),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all users with pagination.
    Requires authentication.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    users = await db.db.users.find().skip(skip).limit(limit).to_list(length=limit)
    return users

@router.get("/me", response_model=User)
async def get_current_user(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current user information.
    """
    return current_user

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific user by ID.
    """
    if not current_user.is_admin and str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new user.
    Only admins can create users.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if user already exists
    existing_user = await db.db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user (password hashing would be handled by auth service)
    user_dict = user_data.dict()
    user_dict["hashed_password"] = user_dict.pop("password")  # This should be hashed
    
    result = await db.db.users.insert_one(user_dict)
    user = await db.db.users.find_one({"_id": result.inserted_id})
    return user

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update a user.
    Users can update their own profile, admins can update any user.
    """
    if not current_user.is_admin and str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if user exists
    user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    if update_data:
        await db.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    updated_user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    return updated_user

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a user.
    Only admins can delete users.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if user exists
    user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user
    await db.db.users.delete_one({"_id": ObjectId(user_id)})
    return {"message": "User deleted successfully"}
