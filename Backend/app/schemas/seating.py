from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SeatingTier


class SeatBase(BaseModel):
    venue_id: int
    name: str = Field(max_length=100)
    tier: SeatingTier = SeatingTier.GENERAL
    capacity: int = Field(ge=0)
    base_price: float = Field(ge=0)




class SeatCreate(SeatBase):
    pass


class SeatUpdate(BaseModel):
    name: Optional[str] = None
    tier: Optional[SeatingTier] = None
    capacity: Optional[int] = Field(default=None, ge=0)
    base_price: Optional[float] = Field(default=None, ge=0)


class SeatRead(SeatBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
