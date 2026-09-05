from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.services import customer_service
from backend.schemas.customer_portal import (
    CustomerDashboardSummary, CustomerInvoiceItem, CustomerInvoiceDetail,
    CustomerPaymentItem, PaymentRequestCreate, PaymentRequestResponse,
    CustomerRespondCounter, CustomerNotificationResponse, UserProfileResponse,
    UserProfileUpdate
)

router = APIRouter(prefix="/api/customer", tags=["customer-portal"])


@router.get("/dashboard", response_model=CustomerDashboardSummary, summary="Get Customer Dashboard Overview")
def get_customer_dashboard(
    email: Optional[str] = Query(None, description="Customer user email for profile lookup"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    return customer_service.get_customer_dashboard(db, buyer)


@router.get("/invoices", response_model=List[CustomerInvoiceItem], summary="List Customer Invoices")
def get_customer_invoices(
    status: Optional[str] = Query(None, description="Filter: 'open', 'paid', 'overdue'"),
    email: Optional[str] = Query(None, description="Customer user email"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    return customer_service.get_customer_invoices_list(db, buyer, status)


@router.get("/invoices/{invoice_id}", response_model=CustomerInvoiceDetail, summary="Get Customer Invoice Detail & Timeline")
def get_customer_invoice_detail(
    invoice_id: str,
    email: Optional[str] = Query(None, description="Customer user email"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    detail = customer_service.get_customer_invoice_detail(db, buyer, invoice_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Invoice '{invoice_id}' not found for customer.")
    return detail


@router.get("/payments", response_model=List[CustomerPaymentItem], summary="Get Customer Payment History")
def get_customer_payments(
    email: Optional[str] = Query(None, description="Customer user email"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    dashboard = customer_service.get_customer_dashboard(db, buyer)
    return dashboard.recent_payments


@router.get("/requests", response_model=List[PaymentRequestResponse], summary="List Customer Payment Extension Requests")
def get_customer_requests(
    email: Optional[str] = Query(None, description="Customer user email"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    return customer_service.get_customer_requests_list(db, buyer)


@router.post("/requests", response_model=PaymentRequestResponse, status_code=status.HTTP_201_CREATED, summary="Submit Payment Term Extension Request")
def create_payment_request(
    request_in: PaymentRequestCreate,
    email: Optional[str] = Query(None, description="Customer user email"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    try:
        return customer_service.create_customer_payment_request(db, buyer, request_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/requests/{request_id}/respond", response_model=PaymentRequestResponse, summary="Respond to Counteroffer")
def respond_to_counteroffer(
    request_id: int,
    response_in: CustomerRespondCounter,
    email: Optional[str] = Query(None, description="Customer user email"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    try:
        return customer_service.customer_respond_to_counter(db, buyer, request_id, response_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/notifications", response_model=List[CustomerNotificationResponse], summary="List Customer Notifications")
def get_customer_notifications(
    email: Optional[str] = Query(None, description="Customer user email"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    return customer_service.get_customer_notifications_list(db, buyer)


@router.post("/notifications/{notification_id}/read", summary="Mark Notification as Read")
def mark_notification_read(
    notification_id: int,
    email: Optional[str] = Query(None, description="Customer user email"),
    db: Session = Depends(get_db)
):
    buyer = customer_service.get_default_customer_buyer(db, email)
    if not buyer:
        raise HTTPException(status_code=404, detail="Customer buyer entity not found.")
    success = customer_service.mark_customer_notification_as_read(db, buyer, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"status": "success", "message": "Notification marked as read."}


@router.get("/profile", response_model=UserProfileResponse, summary="Get Current User Profile")
def get_user_profile(
    email: str = Query("customer@abcindustries.com", description="User email"),
    role: str = Query("CUSTOMER", description="User role: 'ADMIN' or 'CUSTOMER'"),
    db: Session = Depends(get_db)
):
    return customer_service.get_or_create_user_profile(db, email=email, role=role)
