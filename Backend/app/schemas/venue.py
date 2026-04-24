from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class VenueBase(BaseModel):
    name: str = Field(max_length=200)
    address: str = Field(max_length=500)
    city: str = Field(max_length=100)
    total_capacity: int = Field(ge=0)


class VenueCreate(VenueBase):
    pass


class VenueUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    total_capacity: Optional[int] = Field(default=None, ge=0)


class VenueRead(VenueBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
