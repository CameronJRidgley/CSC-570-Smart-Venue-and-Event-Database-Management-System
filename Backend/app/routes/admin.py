"""Admin endpoints: user management + platform stats.

Powers AdminUsers and AdminReports pages.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import func
from sqlmodel import select

from app.core.dependencies import SessionDep
from app.models.enums import EventStatus, PaymentStatus, UserRole
from app.models.sql.event import Event
from app.models.sql.payment import Payment
from app.models.sql.ticket import Ticket
from app.models.sql.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------- schemas ----------
class AdminUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime


class AdminUserUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None


class AdminStat(BaseModel):
    total_users: int
    new_users_30d: int
    total_events: int
    new_events_30d: int
    tickets_sold: int
    tickets_sold_30d: int
    total_revenue: float
    revenue_30d: float


class TopEvent(BaseModel):
    event_id: int
    name: str
    starts_at: datetime
    capacity: int
    sold: int
    revenue: float


# ---------- users ----------
@router.get("/users", response_model=List[AdminUserRead])
def list_users(
    session: SessionDep,
    role: Optional[UserRole] = Query(None),
    q: Optional[str] = Query(None, description="email substring search"),
):
    stmt = select(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if q:
        stmt = stmt.where(User.email.ilike(f"%{q}%"))
    stmt = stmt.order_by(User.created_at.desc())
    return list(session.exec(stmt).all())


@router.patch("/users/{user_id}", response_model=AdminUserRead)
def update_user(user_id: int, payload: AdminUserUpdate, session: SessionDep):
    u = session.get(User, user_id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


# ---------- stats ----------
@router.get("/stats", response_model=AdminStat)
def platform_stats(session: SessionDep):
    cutoff = datetime.utcnow() - timedelta(days=30)

    total_users = session.exec(select(func.count()).select_from(User)).one()
    new_users_30d = session.exec(
        select(func.count()).select_from(User).where(User.created_at >= cutoff)
    ).one()

    total_events = session.exec(select(func.count()).select_from(Event)).one()
    new_events_30d = session.exec(
        select(func.count()).select_from(Event).where(Event.created_at >= cutoff)
    ).one()

    tickets_sold = session.exec(select(func.count()).select_from(Ticket)).one()
    tickets_sold_30d = session.exec(
        select(func.count()).select_from(Ticket).where(Ticket.issued_at >= cutoff)
    ).one()

    total_revenue = session.exec(
        select(func.coalesce(func.sum(Payment.amount), 0.0)).where(
            Payment.status == PaymentStatus.COMPLETED
        )
    ).one() or 0.0
    revenue_30d = session.exec(
        select(func.coalesce(func.sum(Payment.amount), 0.0)).where(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.created_at >= cutoff,
        )
    ).one() or 0.0

    return AdminStat(
        total_users=int(total_users),
        new_users_30d=int(new_users_30d),
        total_events=int(total_events),
        new_events_30d=int(new_events_30d),
        tickets_sold=int(tickets_sold),
        tickets_sold_30d=int(tickets_sold_30d),
        total_revenue=float(total_revenue),
        revenue_30d=float(revenue_30d),
    )


@router.get("/top-events", response_model=List[TopEvent])
def top_events(session: SessionDep, limit: int = Query(10, ge=1, le=50)):
    # Aggregate sold count + revenue per event in one go.
    stmt = (
        select(
            Event.id,
            Event.name,
            Event.starts_at,
            Event.capacity,
            func.count(Ticket.id).label("sold"),
            func.coalesce(func.sum(Ticket.price), 0.0).label("revenue"),
        )
        .join(Ticket, Ticket.event_id == Event.id, isouter=True)
        .group_by(Event.id)
        .order_by(func.coalesce(func.sum(Ticket.price), 0.0).desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    return [
        TopEvent(
            event_id=r[0],
            name=r[1],
            starts_at=r[2],
            capacity=r[3],
            sold=int(r[4] or 0),
            revenue=float(r[5] or 0.0),
        )
        for r in rows
    ]
