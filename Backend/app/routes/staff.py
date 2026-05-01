"""Staff (security personnel / ushers / etc.) management endpoints.

Used by the Personnel Assignment admin page. Backed by the `staff`
SQL table with a single optional event/zone assignment per row.
"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.core.dependencies import SessionDep
from app.models.sql.staff import Staff
from app.schemas.staff import StaffCreate, StaffRead, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=List[StaffRead])
def list_staff(
    session: SessionDep,
    event_id: Optional[int] = Query(None),
):
    stmt = select(Staff)
    if event_id is not None:
        stmt = stmt.where(Staff.event_id == event_id)
    return list(session.exec(stmt).all())


@router.post("", response_model=StaffRead, status_code=status.HTTP_201_CREATED)
def create_staff(payload: StaffCreate, session: SessionDep):
    s = Staff(**payload.model_dump())
    session.add(s)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use") from exc
    session.refresh(s)
    return s


@router.patch("/{staff_id}", response_model=StaffRead)
def update_staff(staff_id: int, payload: StaffUpdate, session: SessionDep):
    s = session.get(Staff, staff_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(staff_id: int, session: SessionDep):
    s = session.get(Staff, staff_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff not found")
    session.delete(s)
    session.commit()
    return None
