from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.enums import ScanResult


class CheckInScanRequest(BaseModel):
    """Payload sent by the scanner app when a QR is read at a gate."""
    qr_code: str
    event_id: int
    gate: Optional[str] = None
    staff_id: Optional[int] = None
    device_info: Dict[str, Any] = Field(default_factory=dict)


class ManualCheckInRequest(BaseModel):
    """Fallback check-in when a QR cannot be scanned.

    Provide exactly one of `ticket_id` or `attendee_email`.
    """
    event_id: int
    ticket_id: Optional[int] = None
    attendee_email: Optional[EmailStr] = None
    gate: Optional[str] = None
    staff_id: Optional[int] = None
    device_info: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _one_lookup(self):
        if bool(self.ticket_id) == bool(self.attendee_email):
            raise ValueError(
                "Provide exactly one of ticket_id or attendee_email"
            )
        return self


class CheckInScanResponse(BaseModel):
    approved: bool
    result: ScanResult
    ticket_id: Optional[int] = None
    attendee_id: Optional[int] = None
    attendee_name: Optional[str] = None
    seat_number: Optional[str] = None
    scanned_at: datetime
    message: str


class ScanLogRead(BaseModel):
    id: str
    ticket_id: Optional[int]
    event_id: Optional[int]
    attendee_id: Optional[int]
    gate: Optional[str]
    staff_id: Optional[int]
    qr_code: Optional[str]
    result: ScanResult
    reason: Optional[str]
    manual: bool
    scanned_at: datetime


class EventCheckInSummary(BaseModel):
    event_id: int
    total_tickets: int         # active tickets (issued + used)
    checked_in: int            # tickets whose status is USED
    remaining: int             # not yet checked in
    approved_scans: int        # count of SUCCESS scan logs for this event
    denied_scans: int          # count of non-SUCCESS scan logs for this event
    recent_logs: List[ScanLogRead]
