# Author: Cameron Ridgley
# Copilot had helped me work through bugs and things to sharp up this file
"""Feedback endpoints (Mongo-backed).

Post-event feedback lives entirely in MongoDB (`feedback` collection)
since the schema is intentionally loose and survey questions can evolve
without migrations.

  - Submit feedback        → POST /api/feedback
  - List for an event      → GET  /api/events/{event_id}/feedback
"""
from typing import List

from fastapi import APIRouter, status

from app.models.nosql.feedback import FeedbackStream
from app.schemas.feedback import FeedbackCreate, FeedbackRead

router = APIRouter(tags=["feedback"])


def _to_read(doc: FeedbackStream) -> FeedbackRead:
    return FeedbackRead(
        id=str(doc.id),
        event_id=doc.event_id,
        attendee_id=doc.attendee_id,
        rating=doc.rating,
        comments=doc.comments,
        tags=doc.tags,
        submitted_at=doc.submitted_at,
    )


@router.post(
    "/feedback",
    response_model=FeedbackRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_feedback(payload: FeedbackCreate):
    doc = FeedbackStream(
        event_id=payload.event_id,
        attendee_id=payload.attendee_id,
        rating=payload.rating,
        comments=payload.comments,
        tags=payload.tags,
    )
    await doc.insert()
    return _to_read(doc)


@router.get(
    "/events/{event_id}/feedback",
    response_model=List[FeedbackRead],
)
async def list_event_feedback(event_id: int):
    docs = await FeedbackStream.find({"event_id": event_id}).sort("-submitted_at").to_list()
    return [_to_read(d) for d in docs]
