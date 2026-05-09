from typing import Optional
from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime
from bson import ObjectId


# ===============================
# Base Mongo Model (Pydantic v2)
# ===============================

class MongoBaseModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)

    model_config = {
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "populate_by_name": True,
        "from_attributes": True,   # ✅ replaces orm_mode
        "validate_by_name": True,  # ✅ replaces allow_population_by_field_name
    }


# ===============================
# User Schemas
# ===============================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    is_admin: bool = False
    role: str = "user"

    model_config = {
        "from_attributes": True
    }


class UserCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    full_name: Optional[str] = None
    password: str
    is_active: bool = True
    is_admin: bool = False
    role: str = "user"

    @field_validator("full_name", mode="before")
    @classmethod
    def set_full_name(cls, v, info):
        if v is None and "name" in info.data:
            return info.data["name"]
        elif v is None:
            raise ValueError("Either name or full_name must be provided")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    role: Optional[str] = None


class UserInDB(UserBase, MongoBaseModel):
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class User(UserBase, MongoBaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
