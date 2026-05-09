from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import MongoBaseModel

class CourseBase(BaseModel):
    code: str = Field(..., description="Course code (e.g., EDU101)")
    name: str = Field(..., description="Course name")
    credits: int = Field(..., description="Number of credits", ge=1, le=10)
    type: str = Field(..., description="Course type (Core, Elective, Minor, Practical)")
    hours_per_week: int = Field(..., description="Hours per week", ge=1, le=20)
    min_per_session: int = Field(default=50, description="Minutes per session", ge=30, le=180)
    semester: Optional[int] = Field(None, description="Semester number", ge=1, le=8)
    program_id: Optional[str] = Field(None, description="Program ID this course belongs to")
    description: Optional[str] = Field(None, description="Course description")
    prerequisites: Optional[List[str]] = Field(default=[], description="List of prerequisite course IDs")
    is_lab: Optional[bool] = Field(default=False, description="Whether this is a lab course")
    lab_hours: Optional[int] = Field(default=0, description="Lab hours per week")
    is_active: Optional[bool] = Field(default=True, description="Whether the course is active")

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    credits: Optional[int] = Field(None, ge=1, le=10)
    type: Optional[str] = None
    hours_per_week: Optional[int] = Field(None, ge=1, le=20)
    min_per_session: Optional[int] = Field(None, ge=30, le=180)
    semester: Optional[int] = Field(None, ge=1, le=8)
    program_id: Optional[str] = None
    description: Optional[str] = None
    prerequisites: Optional[List[str]] = None
    is_lab: Optional[bool] = None
    lab_hours: Optional[int] = None
    is_active: Optional[bool] = None

class Course(CourseBase, MongoBaseModel):
    created_by: Optional[str] = Field(None, description="User who created this course")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
