from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import EventStatus


class EventBase(BaseModel):
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    venue_id: int
    starts_at: datetime
    ends_at: datetime
    capacity: int = Field(ge=0)

    @model_validator(mode="after")
    def _ends_after_starts(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class EventCreate(EventBase):
    status: EventStatus = EventStatus.DRAFT


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    capacity: Optional[int] = Field(default=None, ge=0)
    status: Optional[EventStatus] = None


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: EventStatus
    created_at: datetime
    updated_at: datetime
