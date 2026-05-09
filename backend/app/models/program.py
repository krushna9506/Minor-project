from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import MongoBaseModel

class ProgramBase(BaseModel):
    name: str = Field(..., description="Program name")
    code: str = Field(..., description="Program code")
    type: str = Field(..., description="Program type (FYUP, B.Ed, M.Ed, ITEP)")
    department: str = Field(..., description="Department offering the program")
    duration_years: int = Field(..., description="Duration in years")
    total_semesters: int = Field(..., description="Total number of semesters")
    credits_required: int = Field(..., description="Total credits required for completion")
    description: Optional[str] = Field(None, description="Program description")
    is_active: bool = Field(True, description="Whether the program is active")

class ProgramCreate(ProgramBase):
    pass

class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    department: Optional[str] = None
    duration_years: Optional[int] = None
    total_semesters: Optional[int] = None
    credits_required: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Program(ProgramBase, MongoBaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None