"""FeedbackStream document.

Free-form post-event feedback. Schema is intentionally loose so surveys
can evolve (add questions, tags, etc.) without migrations.
"""
from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class FeedbackStream(Document):
    event_id: int
    attendee_id: Optional[int] = None
    rating: int = Field(ge=1, le=5)
    comments: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "feedback"    # team-aligned collection name
        indexes = [
            IndexModel([("event_id", 1), ("submitted_at", -1)]),
            IndexModel([("rating", 1)]),
        ]
