"""ScanLog document.

Every QR scan at a check-in gate appends one document here. High write
volume + flexible device metadata is the exact profile Mongo is best at.
"""
from datetime import datetime
from typing import Any, Dict, Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel

from app.models.enums import ScanResult


class ScanLog(Document):
    ticket_id: Optional[int] = None      # None if QR was invalid/unknown
    event_id: Optional[int] = None
    attendee_id: Optional[int] = None
    gate: Optional[str] = None
    staff_id: Optional[int] = None       # scanner operator
    qr_code: Optional[str] = None        # None for manual check-ins
    result: ScanResult
    reason: Optional[str] = None         # human-readable denial reason
    manual: bool = False                 # True if POST /checkin/manual
    device_info: Dict[str, Any] = Field(default_factory=dict)
    scanned_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "scan_logs"
        indexes = [
            IndexModel([("event_id", 1), ("scanned_at", -1)]),
            IndexModel([("ticket_id", 1)]),
            IndexModel([("result", 1)]),
        ]
