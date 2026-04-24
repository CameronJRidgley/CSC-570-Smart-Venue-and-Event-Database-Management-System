from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    event_id: int
    attendee_id: Optional[int] = None
    rating: int = Field(ge=1, le=5)
    comments: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class FeedbackRead(BaseModel):
    id: str
    event_id: int
    attendee_id: Optional[int]
    rating: int
    comments: Optional[str]
    tags: List[str]
    submitted_at: datetime
