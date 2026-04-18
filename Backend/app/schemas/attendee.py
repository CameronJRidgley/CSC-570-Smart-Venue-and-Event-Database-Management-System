from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AttendeeBase(BaseModel):
    full_name: str = Field(max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=30)


class AttendeeCreate(AttendeeBase):
    pass


class AttendeeRead(AttendeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
