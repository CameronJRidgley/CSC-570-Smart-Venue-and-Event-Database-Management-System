"""Shared enums used across SQL models, Mongo documents, and API schemas.

Keeping enums in one place prevents drift between layers (e.g. a route
accepting 'open' while the DB expects 'OPEN').
"""
from enum import Enum


class EventStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SeatingTier(str, Enum):
    GENERAL = "general"
    PREMIUM = "premium"
    VIP = "vip"


class TicketStatus(str, Enum):
    # Aligned with team SQL: CHECK(ticket_status IN ('valid','used','cancelled','refunded')).
    VALID = "valid"
    USED = "used"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    CARD = "card"
    CASH = "cash"
    ONLINE = "online"


class UserRole(str, Enum):
    ADMIN = "admin"
    ORGANIZER = "organizer"
    STAFF = "staff"
    ATTENDEE = "attendee"


class StaffRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    SECURITY = "security"
    MEDICAL = "medical"
    USHER = "usher"
    VENDOR_LIAISON = "vendor_liaison"


class IncidentSeverity(str, Enum):
    # Aligned with team SQL: CHECK(severity_level IN ('Low','Medium','High')).
    # CRITICAL is our documented extension for auto-escalation logic (M5).
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class IncidentStatus(str, Enum):
    # Aligned with team SQL: CHECK(status IN ('open','escalated','resolved','closed')).
    OPEN = "open"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentCategory(str, Enum):
    MEDICAL = "medical"
    SECURITY = "security"
    CROWD = "crowd"
    TECHNICAL = "technical"
    FIRE = "fire"
    OTHER = "other"


class IncidentUpdateType(str, Enum):
    CREATED = "created"
    NOTE = "note"
    STATUS_CHANGE = "status_change"
    SEVERITY_CHANGE = "severity_change"
    ESCALATION = "escalation"
    ASSIGNMENT = "assignment"
    RESOLUTION = "resolution"


# Severity ranked low → high for escalation comparisons.
SEVERITY_ORDER: dict[str, int] = {
    "Low": 0,
    "Medium": 1,
    "High": 2,
    "Critical": 3,
}


class ScanResult(str, Enum):
    SUCCESS = "success"
    ALREADY_USED = "already_used"
    INVALID = "invalid"
    EXPIRED = "expired"
    WRONG_EVENT = "wrong_event"


class CrowdAlertLevel(str, Enum):
    NORMAL = "normal"
    ELEVATED = "elevated"
    HIGH = "high"
    CRITICAL = "critical"


class CrowdSource(str, Enum):
    MANUAL = "manual"
    SENSOR = "sensor"
    ESTIMATE = "estimate"


# Alert levels ranked low → high; used to decide "is this an alert?".
CROWD_LEVEL_ORDER: dict[str, int] = {
    "normal": 0,
    "elevated": 1,
    "high": 2,
    "critical": 3,
}
