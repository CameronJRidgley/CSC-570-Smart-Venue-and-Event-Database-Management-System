from typing import List

from pydantic import BaseModel

from app.models.enums import SeatingTier


class SectionAvailability(BaseModel):
    section_id: int
    section_name: str
    tier: SeatingTier
    capacity: int
    sold: int
    available: int


class EventAvailability(BaseModel):
    event_id: int
    event_capacity: int
    total_sold: int
    total_available: int
    sold_out: bool
    sections: List[SectionAvailability]
