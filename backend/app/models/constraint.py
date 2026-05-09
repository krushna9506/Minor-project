from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import MongoBaseModel

class ConstraintBase(BaseModel):
    name: str = Field(..., description="Constraint name")
    type: str = Field(..., description="Constraint type")
    description: Optional[str] = Field(None, description="Constraint description")
    parameters: Dict[str, Any] = Field(default={}, description="Constraint parameters")
    priority: int = Field(default=1, description="Constraint priority (1-10, 10 being highest)")
    is_active: bool = Field(default=True, description="Whether the constraint is active")
    program_id: Optional[str] = Field(None, description="Program ID (None for global constraints)")

class ConstraintCreate(ConstraintBase):
    pass

class ConstraintUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    program_id: Optional[str] = None

class Constraint(ConstraintBase, MongoBaseModel):
    created_by: str = Field(..., description="User who created this constraint")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None