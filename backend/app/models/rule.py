from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class RuleBase(BaseModel):
    name: str = Field(..., example="Time & Rules Settings")
    description: Optional[str] = Field(None, example="Global time and scheduling settings for timetable generation")
    rule_type: Optional[str] = Field("custom", example="time_settings")
    params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_active: Optional[bool] = True


class RuleCreate(RuleBase):
    pass


class RuleUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    rule_type: Optional[str]
    params: Optional[Dict[str, Any]]
    is_active: Optional[bool]


class Rule(RuleBase):
    id: Optional[str]
    created_by: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True
