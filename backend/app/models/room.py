from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import MongoBaseModel

class RoomBase(BaseModel):
    name: str = Field(..., description="Room name/number (e.g., A-101, Lab-3)")
    building: str = Field(..., description="Building name or code")
    floor: int = Field(..., description="Floor number", ge=0, le=20)
    capacity: int = Field(..., description="Maximum occupancy", ge=1, le=500)
    room_type: str = Field(..., description="Type of room (Classroom, Lab, Auditorium, etc.)")
    facilities: List[str] = Field(default_factory=list, description="Available facilities (Projector, AC, Whiteboard, etc.)")
    is_lab: bool = Field(default=False, description="Whether this is a laboratory")
    is_accessible: bool = Field(default=True, description="Wheelchair accessible")
    has_projector: bool = Field(default=False, description="Has projector/display")
    has_ac: bool = Field(default=False, description="Has air conditioning")
    has_wifi: bool = Field(default=True, description="Has WiFi access")
    location_notes: Optional[str] = Field(None, description="Additional location information")
    is_active: bool = Field(default=True, description="Whether the room is available for use")

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[int] = Field(None, ge=0, le=20)
    capacity: Optional[int] = Field(None, ge=1, le=500)
    room_type: Optional[str] = None
    facilities: Optional[List[str]] = None
    is_lab: Optional[bool] = None
    is_accessible: Optional[bool] = None
    has_projector: Optional[bool] = None
    has_ac: Optional[bool] = None
    has_wifi: Optional[bool] = None
    location_notes: Optional[str] = None
    is_active: Optional[bool] = None

class Room(RoomBase, MongoBaseModel):
    created_by: Optional[str] = Field(None, description="User who created this room record")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
