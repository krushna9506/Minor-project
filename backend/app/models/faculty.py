from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class FacultyBase(BaseModel):
    name: str = Field(..., description="Faculty member's full name")
    employee_id: str = Field(..., description="Employee ID")
    department: str = Field(..., description="Department")
    designation: str = Field(..., description="Designation (Professor, Associate Professor, etc.)")
    email: str = Field(..., description="Email address")
    subjects: List[str] = Field(default_factory=list, description="Subjects the faculty can teach")
    max_hours_per_week: int = Field(default=16, description="Maximum teaching hours per week", ge=1, le=40)
    available_days: List[str] = Field(default_factory=list, description="Available days for teaching")

class FacultyCreate(FacultyBase):
    pass

class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[str] = None
    subjects: Optional[List[str]] = None
    max_hours_per_week: Optional[int] = None
    available_days: Optional[List[str]] = None

class FacultyInDB(FacultyBase):
    id: str = Field(alias="_id")
    created_by: str = Field(..., description="User ID who created this faculty record")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True

class Faculty(FacultyInDB):
    pass
