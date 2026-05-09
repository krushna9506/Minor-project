from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class StudentGroupBase(BaseModel):
    name: str = Field(..., description="Group/Class name")
    course_ids: List[str] = Field(..., description="List of course IDs linked to this group")
    year: int = Field(..., ge=1, le=4, description="Academic year (1, 2, 3, 4)")
    semester: str = Field(..., description="Semester (Odd, Even)")
    section: str = Field(..., description="Section (A, B, C, D, Group1, Group2)")
    student_strength: int = Field(..., ge=1, le=200, description="Number of students in the group")
    group_type: str = Field(..., description="Type of group (Regular Class, Practical Lab)")
    program_id: str = Field(..., description="Program ID this group belongs to")

class StudentGroupCreate(StudentGroupBase):
    pass

class StudentGroupUpdate(BaseModel):
    name: Optional[str] = None
    course_ids: Optional[List[str]] = None
    year: Optional[int] = Field(None, ge=1, le=4)
    semester: Optional[str] = None
    section: Optional[str] = None
    student_strength: Optional[int] = Field(None, ge=1, le=200)
    group_type: Optional[str] = None
    program_id: Optional[str] = None

class StudentGroup(StudentGroupBase):
    id: str = Field(..., description="Unique identifier")
    created_by: str = Field(..., description="User who created this group")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        from_attributes = True
