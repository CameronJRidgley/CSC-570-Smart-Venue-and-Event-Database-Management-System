"""Reporting response schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.enums import (
    CrowdAlertLevel,
    IncidentCategory,
    IncidentSeverity,
    PaymentMethod,
)


# ---------------------------------------------------------------------------
# Dashboard (compact)
# ---------------------------------------------------------------------------

class OrganizerDashboard(BaseModel):
    event_id: int
    tickets_sold: int
    checked_in: int
    attendance_rate: float              # 0.0 – 1.0
    ticket_revenue: float
    vendor_revenue: float
    total_revenue: float
    incidents_count: int
    crowd_alerts_count: int


# ---------------------------------------------------------------------------
# Attendance report
# ---------------------------------------------------------------------------

class HourlyCheckIn(BaseModel):
    hour: datetime                      # truncated to the hour
    count: int


class AttendanceReport(BaseModel):
    event_id: int
    tickets_sold: int
    tickets_used: int
    tickets_unused: int
    attendance_rate: float
    approved_scans: int
    denied_scans: int
    checkin_trend: List[HourlyCheckIn]


# ---------------------------------------------------------------------------
# Revenue report
# ---------------------------------------------------------------------------

class VendorRevenueRow(BaseModel):
    vendor_id: int
    vendor_name: str
    total_amount: float
    transactions: int


class PaymentMethodRow(BaseModel):
    payment_method: PaymentMethod
    total_amount: float
    transactions: int


class RevenueReport(BaseModel):
    event_id: int
    ticket_revenue: float
    ticket_count: int
    vendor_revenue: float
    vendor_transactions: int
    total_revenue: float
    by_vendor: List[VendorRevenueRow]
    by_payment_method: List[PaymentMethodRow]


# ---------------------------------------------------------------------------
# Safety report
# ---------------------------------------------------------------------------

class SeverityCount(BaseModel):
    severity: IncidentSeverity
    count: int


class CategoryCount(BaseModel):
    category: IncidentCategory
    count: int


class ZoneDensity(BaseModel):
    zone: str
    peak_people_count: int
    latest_alert_level: CrowdAlertLevel
    latest_recorded_at: datetime


class SafetyReport(BaseModel):
    event_id: int
    incidents_total: int
    incidents_open: int
    incidents_resolved: int
    by_severity: List[SeverityCount]
    by_category: List[CategoryCount]
    escalations_count: int
    crowd_alerts_count: int
    top_density_zones: List[ZoneDensity]


# ---------------------------------------------------------------------------
# Post-event combined report
# ---------------------------------------------------------------------------

class PostEventReport(BaseModel):
    event_id: int
    generated_at: datetime
    attendance: AttendanceReport
    revenue: RevenueReport
    safety: SafetyReport
