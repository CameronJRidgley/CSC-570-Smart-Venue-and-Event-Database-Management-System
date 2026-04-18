"""Check-in verification business logic.

Design notes:
    * Postgres is the source of truth for ticket state.
    * MongoDB holds the append-only audit trail of every scan
      (approved and denied).
    * We ALWAYS write a scan log, even on denials, so gate operators
      can audit fraud/invalid-QR patterns.
    * Scan logs are best-effort: if Mongo is unreachable the gate must
      still work — we log the error and return the SQL-backed result.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.logging import logger
from app.models.enums import ScanResult, TicketStatus
from app.models.sql.attendee import Attendee
from app.models.sql.ticket import Ticket
from app.repositories import (
    attendee_repo,
    scan_log_repo,
    ticket_repo,
)
from app.schemas.checkin import (
    CheckInScanRequest,
    CheckInScanResponse,
    EventCheckInSummary,
    ManualCheckInRequest,
    ScanLogRead,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

@dataclass
class _Evaluation:
    result: ScanResult
    approved: bool
    reason: str


def _evaluate(ticket: Optional[Ticket], expected_event_id: int) -> _Evaluation:
    """Pure decision function: given a ticket and the expected event,
    decide whether entry is allowed and why/why not.
    """
    if ticket is None:
        return _Evaluation(ScanResult.INVALID, False, "Ticket not found")

    if ticket.event_id != expected_event_id:
        return _Evaluation(
            ScanResult.WRONG_EVENT,
            False,
            f"Ticket belongs to event {ticket.event_id}, not {expected_event_id}",
        )

    if ticket.status == TicketStatus.USED:
        return _Evaluation(
            ScanResult.ALREADY_USED,
            False,
            f"Ticket was already used at {ticket.used_at.isoformat() if ticket.used_at else 'unknown time'}",
        )

    if ticket.status in (TicketStatus.CANCELLED, TicketStatus.REFUNDED):
        return _Evaluation(
            ScanResult.EXPIRED,
            False,
            f"Ticket status is {ticket.status.value}",
        )

    if ticket.status != TicketStatus.VALID:
        return _Evaluation(ScanResult.INVALID, False, f"Unexpected status: {ticket.status.value}")

    return _Evaluation(ScanResult.SUCCESS, True, "OK")


def _mark_used(session: Session, ticket: Ticket) -> Ticket:
    ticket.status = TicketStatus.USED
    ticket.used_at = datetime.utcnow()
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


async def _safe_log(**kwargs) -> Optional[datetime]:
    """Write a scan log but never let Mongo failures break the gate."""
    try:
        log = await scan_log_repo.create_scan_log(**kwargs)
        return log.scanned_at
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Failed to write scan log: %s", exc)
        return None


def _load_attendee(session: Session, attendee_id: int) -> Optional[Attendee]:
    return attendee_repo.get_attendee(session, attendee_id)


def _build_response(
    *, ticket: Optional[Ticket], attendee: Optional[Attendee],
    evaluation: _Evaluation, scanned_at: datetime,
) -> CheckInScanResponse:
    return CheckInScanResponse(
        approved=evaluation.approved,
        result=evaluation.result,
        ticket_id=ticket.id if ticket else None,
        attendee_id=attendee.id if attendee else None,
        attendee_name=attendee.full_name if attendee else None,
        seat_number=ticket.seat_number if ticket else None,
        scanned_at=scanned_at,
        message=evaluation.reason,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def scan_qr(
    session: Session, req: CheckInScanRequest
) -> CheckInScanResponse:
    ticket = ticket_repo.get_ticket_by_qr(session, req.qr_code)
    evaluation = _evaluate(ticket, req.event_id)

    attendee: Optional[Attendee] = None
    if evaluation.approved and ticket is not None:
        ticket = _mark_used(session, ticket)
        attendee = _load_attendee(session, ticket.attendee_id)
    elif ticket is not None:
        attendee = _load_attendee(session, ticket.attendee_id)

    logged_at = await _safe_log(
        event_id=req.event_id,
        ticket_id=ticket.id if ticket else None,
        attendee_id=attendee.id if attendee else None,
        qr_code=req.qr_code,
        result=evaluation.result,
        reason=None if evaluation.approved else evaluation.reason,
        gate=req.gate,
        staff_id=req.staff_id,
        manual=False,
        device_info=req.device_info,
    )

    return _build_response(
        ticket=ticket,
        attendee=attendee,
        evaluation=evaluation,
        scanned_at=logged_at or datetime.utcnow(),
    )


async def manual_check_in(
    session: Session, req: ManualCheckInRequest
) -> CheckInScanResponse:
    ticket, lookup_error = _manual_lookup(session, req)

    if ticket is None:
        evaluation = _Evaluation(ScanResult.INVALID, False, lookup_error or "Ticket not found")
    else:
        evaluation = _evaluate(ticket, req.event_id)

    attendee: Optional[Attendee] = None
    if evaluation.approved and ticket is not None:
        ticket = _mark_used(session, ticket)
        attendee = _load_attendee(session, ticket.attendee_id)
    elif ticket is not None:
        attendee = _load_attendee(session, ticket.attendee_id)

    logged_at = await _safe_log(
        event_id=req.event_id,
        ticket_id=ticket.id if ticket else None,
        attendee_id=attendee.id if attendee else None,
        qr_code=None,
        result=evaluation.result,
        reason=None if evaluation.approved else evaluation.reason,
        gate=req.gate,
        staff_id=req.staff_id,
        manual=True,
        device_info=req.device_info,
    )

    return _build_response(
        ticket=ticket,
        attendee=attendee,
        evaluation=evaluation,
        scanned_at=logged_at or datetime.utcnow(),
    )


def _manual_lookup(
    session: Session, req: ManualCheckInRequest
) -> Tuple[Optional[Ticket], Optional[str]]:
    if req.ticket_id is not None:
        return ticket_repo.get_ticket(session, req.ticket_id), None

    assert req.attendee_email is not None  # enforced by schema validator
    matches = ticket_repo.get_active_ticket_by_email_for_event(
        session, req.attendee_email, req.event_id
    )
    if not matches:
        return None, "No active ticket found for that email at this event"
    if len(matches) > 1:
        # Ambiguous — force operator to pick a specific ticket_id.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Multiple active tickets found for {req.attendee_email}; "
            "supply ticket_id instead.",
        )
    return matches[0], None


# ---------------------------------------------------------------------------
# Event-level reads
# ---------------------------------------------------------------------------

async def event_summary(session: Session, event_id: int) -> EventCheckInSummary:
    issued = ticket_repo.count_by_status_for_event(session, event_id, TicketStatus.VALID)
    used = ticket_repo.count_by_status_for_event(session, event_id, TicketStatus.USED)
    total = issued + used

    approved = await scan_log_repo.count_logs_for_event(event_id, ScanResult.SUCCESS)
    all_logs = await scan_log_repo.count_logs_for_event(event_id)
    denied = all_logs - approved

    recent = await scan_log_repo.list_logs_for_event(event_id, limit=20)

    return EventCheckInSummary(
        event_id=event_id,
        total_tickets=total,
        checked_in=used,
        remaining=issued,
        approved_scans=approved,
        denied_scans=denied,
        recent_logs=[_scan_log_to_read(l) for l in recent],
    )


async def list_event_logs(
    event_id: int, limit: int = 100, skip: int = 0
) -> List[ScanLogRead]:
    logs = await scan_log_repo.list_logs_for_event(event_id, limit=limit, skip=skip)
    return [_scan_log_to_read(l) for l in logs]


def _scan_log_to_read(log) -> ScanLogRead:
    return ScanLogRead(
        id=str(log.id),
        ticket_id=log.ticket_id,
        event_id=log.event_id,
        attendee_id=log.attendee_id,
        gate=log.gate,
        staff_id=log.staff_id,
        qr_code=log.qr_code,
        result=log.result,
        reason=log.reason,
        manual=log.manual,
        scanned_at=log.scanned_at,
    )
