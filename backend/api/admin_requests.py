from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.services import customer_service
from backend.schemas.customer_portal import PaymentRequestResponse, AdminRespondRequest

router = APIRouter(prefix="/api/admin/requests", tags=["admin-customer-requests"])


@router.get("", response_model=List[PaymentRequestResponse], summary="List All Customer Extension Requests")
def list_admin_customer_requests(
    status: Optional[str] = Query(None, description="Filter by status: 'PENDING', 'APPROVED', 'REJECTED', 'COUNTEROFFER'"),
    db: Session = Depends(get_db)
):
    return customer_service.get_all_admin_requests(db, status_filter=status)


@router.post("/{request_id}/respond", response_model=PaymentRequestResponse, summary="Admin Respond to Customer Extension Request")
def respond_to_customer_request(
    request_id: int,
    response_in: AdminRespondRequest,
    db: Session = Depends(get_db)
):
    try:
        return customer_service.admin_respond_to_request(db, request_id, response_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
