"""Ticket endpoints."""
from typing import List

from fastapi import APIRouter, status

from app.core.dependencies import SessionDep
from app.schemas.ticket import (
    TicketPurchaseRequest,
    TicketPurchaseResponse,
    TicketRead,
    TicketStatusUpdate,
)
from app.services import ticketing_service

router = APIRouter(tags=["tickets"])


@router.post(
    "/tickets/purchase",
    response_model=TicketPurchaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def purchase_ticket(req: TicketPurchaseRequest, session: SessionDep):
    return ticketing_service.purchase_ticket(session, req)


@router.get("/tickets/{ticket_id}", response_model=TicketRead)
def get_ticket(ticket_id: int, session: SessionDep):
    return ticketing_service.get_ticket_or_404(session, ticket_id)


@router.patch("/tickets/{ticket_id}/status", response_model=TicketRead)
def update_ticket_status(
    ticket_id: int, payload: TicketStatusUpdate, session: SessionDep
):
    return ticketing_service.update_ticket_status(session, ticket_id, payload.status)


@router.get("/users/{user_id}/tickets", response_model=List[TicketRead])
def list_user_tickets(user_id: int, session: SessionDep):
    return ticketing_service.list_tickets_for_user(session, user_id)
