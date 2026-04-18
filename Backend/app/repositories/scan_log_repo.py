"""Scan log repository (MongoDB via Beanie).

Every check-in attempt — approved or denied — gets one document.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.enums import ScanResult
from app.models.nosql.scan_log import ScanLog


async def create_scan_log(
    *,
    event_id: Optional[int],
    ticket_id: Optional[int] = None,
    attendee_id: Optional[int] = None,
    qr_code: Optional[str] = None,
    result: ScanResult,
    reason: Optional[str] = None,
    gate: Optional[str] = None,
    staff_id: Optional[int] = None,
    manual: bool = False,
    device_info: Optional[Dict[str, Any]] = None,
) -> ScanLog:
    log = ScanLog(
        event_id=event_id,
        ticket_id=ticket_id,
        attendee_id=attendee_id,
        qr_code=qr_code,
        result=result,
        reason=reason,
        gate=gate,
        staff_id=staff_id,
        manual=manual,
        device_info=device_info or {},
        scanned_at=datetime.utcnow(),
    )
    await log.insert()
    return log


async def list_logs_for_event(
    event_id: int, limit: int = 100, skip: int = 0
) -> List[ScanLog]:
    return (
        await ScanLog.find(ScanLog.event_id == event_id)
        .sort(-ScanLog.scanned_at)
        .skip(skip)
        .limit(limit)
        .to_list()
    )


async def count_logs_for_event(event_id: int, result: Optional[ScanResult] = None) -> int:
    query = {"event_id": event_id}
    if result is not None:
        query["result"] = result.value
    return await ScanLog.find(query).count()
