from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import MongoBaseModel

class TimeSlot(BaseModel):
    day: str = Field(..., description="Day of the week")
    start_time: str = Field(..., description="Start time (HH:MM format)")
    end_time: str = Field(..., description="End time (HH:MM format)")
    duration_minutes: int = Field(..., description="Duration in minutes")

# inside TimetableEntry
class TimetableEntry(BaseModel):
    course_id: str = Field(..., description="Course ID")
    faculty_id: str = Field(..., description="Faculty ID")
    room_id: str = Field(..., description="Room ID")
    group_id: Optional[str] = Field(None, description="Student group / lab subgroup ID")
    time_slot: TimeSlot = Field(..., description="Time slot details")


class TimetableBase(BaseModel):
    title: str = Field(..., description="Timetable title")
    program_id: str = Field(..., description="Program ID")
    semester: int = Field(..., description="Semester number")
    academic_year: str = Field(..., description="Academic year (e.g., '2024-25')")
    entries: List[TimetableEntry] = Field(default=[], description="Timetable entries")
    is_draft: bool = Field(default=True, description="Whether this is a draft")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")

class TimetableCreate(BaseModel):
    title: str = Field(..., description="Timetable title")
    program_id: str = Field(..., description="Program ID")
    semester: int = Field(..., description="Semester number")
    academic_year: str = Field(..., description="Academic year (e.g., '2024-25')")
    metadata: Optional[Dict[str, Any]] = None

class TimetableUpdate(BaseModel):
    title: Optional[str] = None
    program_id: Optional[str] = None
    semester: Optional[int] = None
    academic_year: Optional[str] = None
    entries: Optional[List[TimetableEntry]] = None
    is_draft: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

class Timetable(TimetableBase, MongoBaseModel):
    created_by: str = Field(..., description="User who created this timetable")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    generated_at: Optional[datetime] = None
    validation_status: str = Field(default="pending", description="Validation status")
    optimization_score: Optional[float] = Field(None, description="AI optimization score")