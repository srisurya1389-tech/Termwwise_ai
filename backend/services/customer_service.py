from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.buyer import Buyer
from backend.models.invoice import Invoice
from backend.models.payment import Payment, PaymentAuditLog
from backend.models.customer_portal import Company, UserProfile, PaymentRequest, CustomerNotification
from backend.schemas.customer_portal import (
    CustomerDashboardSummary, CustomerInvoiceItem, CustomerInvoiceDetail,
    CustomerPaymentItem, PaymentRequestCreate, PaymentRequestResponse,
    AdminRespondRequest, CustomerRespondCounter, CustomerNotificationResponse,
    UserProfileResponse, UserProfileUpdate
)


def get_default_customer_buyer(db: Session, email: Optional[str] = None) -> Buyer:
    """
    Get or resolve the buyer associated with the customer profile.
    Defaults to ABC Industries (the primary demo scenario) if unspecified.
    """
    if email:
        profile = db.query(UserProfile).filter(UserProfile.email == email).first()
        if profile and profile.buyer_id:
            buyer = db.query(Buyer).filter(Buyer.id == profile.buyer_id).first()
            if buyer:
                return buyer

    # Default to first buyer or ABC Industries
    abc_buyer = db.query(Buyer).filter(Buyer.name.like("%ABC%")).first()
    if abc_buyer:
        return abc_buyer
    return db.query(Buyer).first()


def calculate_invoice_settlement(inv: Invoice, payments: List[Payment]):
    """
    Compute paid amount and remaining balance for an invoice.
    """
    successful_payments = [p for p in payments if p.invoice_id == inv.invoice_id and p.status == "SUCCESS"]
    paid_amount = sum(p.amount for p in successful_payments)
    
    if inv.payment_status.lower() == "paid":
        paid_amount = max(paid_amount, inv.amount)
        outstanding = 0.0
    else:
        outstanding = max(0.0, inv.amount - paid_amount)

    today = date.today()
    days_until_due = (inv.due_date - today).days if inv.due_date else 0

    return paid_amount, outstanding, days_until_due


def get_customer_dashboard(db: Session, buyer: Buyer) -> CustomerDashboardSummary:
    """
    Compile safe customer overview metrics without exposing internal risk/priority intelligence.
    """
    invoices = db.query(Invoice).filter(Invoice.buyer_id == buyer.id).all()
    all_payments = db.query(Payment).filter(Payment.buyer_id == buyer.id).all()
    requests = db.query(PaymentRequest).filter(PaymentRequest.buyer_id == buyer.id).all()
    notifications = db.query(CustomerNotification).filter(
        CustomerNotification.buyer_id == buyer.id
    ).all()

    total_outstanding = 0.0
    total_paid = 0.0
    upcoming_30d = 0.0
    open_count = 0
    overdue_count = 0
    
    upcoming_items = []
    today = date.today()
    active_requests_map = {r.invoice_id: r for r in requests if r.status in ("PENDING", "COUNTEROFFER")}

    for inv in invoices:
        paid_amt, out_amt, days_due = calculate_invoice_settlement(inv, all_payments)
        total_paid += paid_amt
        total_outstanding += out_amt

        if inv.payment_status.lower() != "paid" and out_amt > 0:
            open_count += 1
            if days_due < 0:
                overdue_count += 1
            elif days_due <= 30:
                upcoming_30d += out_amt

            upcoming_items.append(CustomerInvoiceItem(
                invoice_id=inv.invoice_id,
                amount=inv.amount,
                paid_amount=paid_amt,
                outstanding_amount=out_amt,
                invoice_date=inv.invoice_date,
                agreed_payment_days=inv.agreed_payment_days,
                due_date=inv.due_date,
                payment_status=inv.payment_status,
                days_until_due=days_due,
                has_active_request=inv.invoice_id in active_requests_map
            ))

    # Sort upcoming invoices by nearest due date
    upcoming_items.sort(key=lambda x: x.days_until_due)

    # Recent successful payments
    recent_successful = [
        CustomerPaymentItem(
            payment_id=p.payment_id,
            invoice_id=p.invoice_id,
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            payment_date=p.payment_date,
            source=p.source
        )
        for p in all_payments if p.status == "SUCCESS"
    ]
    recent_successful.sort(key=lambda x: x.payment_date, reverse=True)

    pending_requests = [r for r in requests if r.status in ("PENDING", "COUNTEROFFER")]
    unread_notifs = [n for n in notifications if not n.read]

    return CustomerDashboardSummary(
        customer_name=buyer.name,
        company_name="NovaCraft Manufacturing",
        buyer_id=buyer.id,
        total_outstanding=round(total_outstanding, 2),
        total_paid=round(total_paid, 2),
        upcoming_due_30d=round(upcoming_30d, 2),
        open_invoices_count=open_count,
        overdue_count=overdue_count,
        recent_payments=recent_successful[:5],
        upcoming_invoices=upcoming_items[:5],
        pending_requests_count=len(pending_requests),
        unread_notifications_count=len(unread_notifs)
    )


def get_customer_invoices_list(db: Session, buyer: Buyer, status_filter: Optional[str] = None) -> List[CustomerInvoiceItem]:
    invoices = db.query(Invoice).filter(Invoice.buyer_id == buyer.id).all()
    all_payments = db.query(Payment).filter(Payment.buyer_id == buyer.id).all()
    requests = db.query(PaymentRequest).filter(PaymentRequest.buyer_id == buyer.id).all()
    active_requests_map = {r.invoice_id: r for r in requests if r.status in ("PENDING", "COUNTEROFFER")}

    items = []
    for inv in invoices:
        paid_amt, out_amt, days_due = calculate_invoice_settlement(inv, all_payments)
        
        # Apply filter if provided
        if status_filter:
            if status_filter.lower() == "open" and inv.payment_status.lower() == "paid":
                continue
            elif status_filter.lower() == "paid" and inv.payment_status.lower() != "paid":
                continue
            elif status_filter.lower() == "overdue" and (inv.payment_status.lower() == "paid" or days_due >= 0):
                continue

        items.append(CustomerInvoiceItem(
            invoice_id=inv.invoice_id,
            amount=inv.amount,
            paid_amount=paid_amt,
            outstanding_amount=out_amt,
            invoice_date=inv.invoice_date,
            agreed_payment_days=inv.agreed_payment_days,
            due_date=inv.due_date,
            payment_status=inv.payment_status,
            days_until_due=days_due,
            has_active_request=inv.invoice_id in active_requests_map
        ))

    items.sort(key=lambda x: x.invoice_date, reverse=True)
    return items


def get_customer_invoice_detail(db: Session, buyer: Buyer, invoice_id: str) -> Optional[CustomerInvoiceDetail]:
    inv = db.query(Invoice).filter(Invoice.invoice_id == invoice_id, Invoice.buyer_id == buyer.id).first()
    if not inv:
        return None

    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).order_by(Payment.payment_date.desc()).all()
    paid_amt, out_amt, days_due = calculate_invoice_settlement(inv, payments)

    # Active or latest request
    req = db.query(PaymentRequest).filter(
        PaymentRequest.invoice_id == invoice_id,
        PaymentRequest.buyer_id == buyer.id
    ).order_by(PaymentRequest.created_at.desc()).first()

    req_dto = None
    if req:
        req_dto = PaymentRequestResponse(
            id=req.id,
            invoice_id=req.invoice_id,
            buyer_id=req.buyer_id,
            buyer_name=buyer.name,
            company_id=req.company_id,
            customer_id=req.customer_id,
            current_term=req.current_term,
            requested_term=req.requested_term,
            requested_date=req.requested_date,
            reason=req.reason,
            message=req.message,
            status=req.status,
            counter_term=req.counter_term,
            counter_date=req.counter_date,
            counter_message=req.counter_message,
            created_at=req.created_at,
            updated_at=req.updated_at
        )

    payment_items = [
        CustomerPaymentItem(
            payment_id=p.payment_id,
            invoice_id=p.invoice_id,
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            payment_date=p.payment_date,
            source=p.source
        )
        for p in payments
    ]

    return CustomerInvoiceDetail(
        invoice_id=inv.invoice_id,
        buyer_name=buyer.name,
        amount=inv.amount,
        paid_amount=paid_amt,
        outstanding_amount=out_amt,
        invoice_date=inv.invoice_date,
        agreed_payment_days=inv.agreed_payment_days,
        due_date=inv.due_date,
        payment_status=inv.payment_status,
        days_until_due=days_due,
        has_active_request=req is not None and req.status in ("PENDING", "COUNTEROFFER"),
        payments=payment_items,
        active_request=req_dto
    )


def create_customer_payment_request(db: Session, buyer: Buyer, data: PaymentRequestCreate, customer_id: Optional[int] = None) -> PaymentRequestResponse:
    inv = db.query(Invoice).filter(Invoice.invoice_id == data.invoice_id, Invoice.buyer_id == buyer.id).first()
    if not inv:
        raise ValueError(f"Invoice '{data.invoice_id}' not found for customer.")

    # Calculate requested due date if not provided
    req_date = data.requested_date or (inv.invoice_date + timedelta(days=data.requested_term))

    req = PaymentRequest(
        invoice_id=data.invoice_id,
        buyer_id=buyer.id,
        company_id=1,
        customer_id=customer_id,
        current_term=inv.agreed_payment_days,
        requested_term=data.requested_term,
        requested_date=req_date,
        reason=data.reason,
        message=data.message,
        status="PENDING"
    )
    db.add(req)
    
    # Add audit log
    audit = PaymentAuditLog(
        event_type="CUSTOMER_REQUEST_CREATED",
        message=f"Customer {buyer.name} requested term extension on {inv.invoice_id} to {data.requested_term} days. Reason: {data.reason}",
        status="INFO"
    )
    db.add(audit)

    # Add confirmation notification for customer
    notif = CustomerNotification(
        buyer_id=buyer.id,
        title="Payment Request Submitted",
        message=f"Your extension request on invoice {inv.invoice_id} ({data.requested_term} days) has been sent to NovaCraft finance.",
        type="REQUEST"
    )
    db.add(notif)
    
    db.commit()
    db.refresh(req)

    return PaymentRequestResponse(
        id=req.id,
        invoice_id=req.invoice_id,
        buyer_id=req.buyer_id,
        buyer_name=buyer.name,
        company_id=req.company_id,
        customer_id=req.customer_id,
        current_term=req.current_term,
        requested_term=req.requested_term,
        requested_date=req.requested_date,
        reason=req.reason,
        message=req.message,
        status=req.status,
        counter_term=req.counter_term,
        counter_date=req.counter_date,
        counter_message=req.counter_message,
        created_at=req.created_at,
        updated_at=req.updated_at
    )


def get_customer_requests_list(db: Session, buyer: Buyer) -> List[PaymentRequestResponse]:
    requests = db.query(PaymentRequest).filter(PaymentRequest.buyer_id == buyer.id).order_by(PaymentRequest.created_at.desc()).all()
    return [
        PaymentRequestResponse(
            id=r.id,
            invoice_id=r.invoice_id,
            buyer_id=r.buyer_id,
            buyer_name=buyer.name,
            company_id=r.company_id,
            customer_id=r.customer_id,
            current_term=r.current_term,
            requested_term=r.requested_term,
            requested_date=r.requested_date,
            reason=r.reason,
            message=r.message,
            status=r.status,
            counter_term=r.counter_term,
            counter_date=r.counter_date,
            counter_message=r.counter_message,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in requests
    ]


def customer_respond_to_counter(db: Session, buyer: Buyer, request_id: int, response: CustomerRespondCounter) -> PaymentRequestResponse:
    req = db.query(PaymentRequest).filter(PaymentRequest.id == request_id, PaymentRequest.buyer_id == buyer.id).first()
    if not req:
        raise ValueError("Payment request not found.")

    if req.status != "COUNTEROFFER":
        raise ValueError("This request does not have a pending counteroffer.")

    inv = db.query(Invoice).filter(Invoice.invoice_id == req.invoice_id).first()

    if response.action == "ACCEPT":
        req.status = "APPROVED"
        if req.counter_term and inv:
            inv.agreed_payment_days = req.counter_term
            if req.counter_date:
                inv.due_date = req.counter_date
            else:
                inv.due_date = inv.invoice_date + timedelta(days=req.counter_term)
            db.add(inv)

        notif = CustomerNotification(
            buyer_id=buyer.id,
            title="Counteroffer Accepted",
            message=f"You accepted the terms of {req.counter_term} days on invoice {req.invoice_id}. New due date: {inv.due_date if inv else ''}.",
            type="REQUEST"
        )
        audit = PaymentAuditLog(
            event_type="CUSTOMER_COUNTEROFFER_ACCEPTED",
            message=f"Customer {buyer.name} accepted counteroffer of {req.counter_term} days on {req.invoice_id}.",
            status="INFO"
        )
        db.add_all([notif, audit])

    else:
        req.status = "REJECTED"
        notif = CustomerNotification(
            buyer_id=buyer.id,
            title="Counteroffer Declined",
            message=f"You declined the counteroffer on invoice {req.invoice_id}. Original terms remain active.",
            type="REQUEST"
        )
        audit = PaymentAuditLog(
            event_type="CUSTOMER_COUNTEROFFER_REJECTED",
            message=f"Customer {buyer.name} declined counteroffer on {req.invoice_id}.",
            status="INFO"
        )
        db.add_all([notif, audit])

    db.commit()
    db.refresh(req)

    return PaymentRequestResponse(
        id=req.id,
        invoice_id=req.invoice_id,
        buyer_id=req.buyer_id,
        buyer_name=buyer.name,
        company_id=req.company_id,
        customer_id=req.customer_id,
        current_term=req.current_term,
        requested_term=req.requested_term,
        requested_date=req.requested_date,
        reason=req.reason,
        message=req.message,
        status=req.status,
        counter_term=req.counter_term,
        counter_date=req.counter_date,
        counter_message=req.counter_message,
        created_at=req.created_at,
        updated_at=req.updated_at
    )


# --- Admin-Side Customer Requests Management ---
def get_all_admin_requests(db: Session, status_filter: Optional[str] = None) -> List[PaymentRequestResponse]:
    query = db.query(PaymentRequest)
    if status_filter:
        query = query.filter(PaymentRequest.status == status_filter.upper())
    
    requests = query.order_by(PaymentRequest.created_at.desc()).all()
    results = []
    for r in requests:
        buyer_name = r.buyer.name if r.buyer else "Unknown Buyer"
        results.append(PaymentRequestResponse(
            id=r.id,
            invoice_id=r.invoice_id,
            buyer_id=r.buyer_id,
            buyer_name=buyer_name,
            company_id=r.company_id,
            customer_id=r.customer_id,
            current_term=r.current_term,
            requested_term=r.requested_term,
            requested_date=r.requested_date,
            reason=r.reason,
            message=r.message,
            status=r.status,
            counter_term=r.counter_term,
            counter_date=r.counter_date,
            counter_message=r.counter_message,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return results


def admin_respond_to_request(db: Session, request_id: int, response_data: AdminRespondRequest) -> PaymentRequestResponse:
    req = db.query(PaymentRequest).filter(PaymentRequest.id == request_id).first()
    if not req:
        raise ValueError(f"Request with ID {request_id} not found.")

    inv = db.query(Invoice).filter(Invoice.invoice_id == req.invoice_id).first()
    buyer = req.buyer

    if response_data.action == "APPROVE":
        req.status = "APPROVED"
        if inv:
            inv.agreed_payment_days = req.requested_term
            if req.requested_date:
                inv.due_date = req.requested_date
            else:
                inv.due_date = inv.invoice_date + timedelta(days=req.requested_term)
            db.add(inv)

        notif = CustomerNotification(
            buyer_id=req.buyer_id,
            title="Term Extension Approved!",
            message=f"NovaCraft Finance approved your request for {req.requested_term} days on invoice {req.invoice_id}. Due date updated to {inv.due_date if inv else ''}.",
            type="REQUEST"
        )
        audit = PaymentAuditLog(
            event_type="ADMIN_APPROVED_CUSTOMER_REQUEST",
            message=f"Admin approved extension request for {buyer.name if buyer else 'Buyer'} on {req.invoice_id} to {req.requested_term} days.",
            status="INFO"
        )
        db.add_all([notif, audit])

    elif response_data.action == "REJECT":
        req.status = "REJECTED"
        notif = CustomerNotification(
            buyer_id=req.buyer_id,
            title="Term Extension Request Declined",
            message=f"NovaCraft Finance was unable to approve the requested term extension on invoice {req.invoice_id}.",
            type="REQUEST"
        )
        audit = PaymentAuditLog(
            event_type="ADMIN_REJECTED_CUSTOMER_REQUEST",
            message=f"Admin declined extension request for {buyer.name if buyer else 'Buyer'} on {req.invoice_id}.",
            status="INFO"
        )
        db.add_all([notif, audit])

    elif response_data.action == "COUNTEROFFER":
        req.status = "COUNTEROFFER"
        req.counter_term = response_data.counter_term or 75
        if response_data.counter_date:
            req.counter_date = response_data.counter_date
        elif inv:
            req.counter_date = inv.invoice_date + timedelta(days=req.counter_term)
        req.counter_message = response_data.counter_message or "We can offer 75 days to support your operational cash planning."

        notif = CustomerNotification(
            buyer_id=req.buyer_id,
            title="Counteroffer Received",
            message=f"NovaCraft Finance proposed an alternative term of {req.counter_term} days for invoice {req.invoice_id}. Please review and respond in your portal.",
            type="REQUEST"
        )
        audit = PaymentAuditLog(
            event_type="ADMIN_SENT_COUNTEROFFER",
            message=f"Admin proposed counteroffer of {req.counter_term} days to {buyer.name if buyer else 'Buyer'} on {req.invoice_id}.",
            status="INFO"
        )
        db.add_all([notif, audit])

    db.commit()
    db.refresh(req)

    return PaymentRequestResponse(
        id=req.id,
        invoice_id=req.invoice_id,
        buyer_id=req.buyer_id,
        buyer_name=buyer.name if buyer else "Unknown Buyer",
        company_id=req.company_id,
        customer_id=req.customer_id,
        current_term=req.current_term,
        requested_term=req.requested_term,
        requested_date=req.requested_date,
        reason=req.reason,
        message=req.message,
        status=req.status,
        counter_term=req.counter_term,
        counter_date=req.counter_date,
        counter_message=req.counter_message,
        created_at=req.created_at,
        updated_at=req.updated_at
    )


# --- Customer Notifications & Profile ---
def get_customer_notifications_list(db: Session, buyer: Buyer) -> List[CustomerNotificationResponse]:
    notifs = db.query(CustomerNotification).filter(
        CustomerNotification.buyer_id == buyer.id
    ).order_by(CustomerNotification.created_at.desc()).all()
    
    return [
        CustomerNotificationResponse(
            id=n.id,
            user_id=n.user_id,
            buyer_id=n.buyer_id,
            title=n.title,
            message=n.message,
            type=n.type,
            read=n.read,
            created_at=n.created_at
        )
        for n in notifs
    ]


def mark_customer_notification_as_read(db: Session, buyer: Buyer, notification_id: int) -> bool:
    notif = db.query(CustomerNotification).filter(
        CustomerNotification.id == notification_id,
        CustomerNotification.buyer_id == buyer.id
    ).first()
    if not notif:
        return False
    notif.read = True
    db.commit()
    return True


def get_or_create_user_profile(db: Session, email: str, full_name: str = "", role: str = "CUSTOMER", buyer_id: Optional[int] = None) -> UserProfileResponse:
    profile = db.query(UserProfile).filter(UserProfile.email == email).first()
    if not profile:
        profile = UserProfile(
            email=email,
            full_name=full_name or email.split("@")[0].capitalize(),
            role=role,
            company_id=1,
            buyer_id=buyer_id or (1 if role == "CUSTOMER" else None)
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    company_name = profile.company.name if profile.company else "NovaCraft Manufacturing"
    buyer_name = profile.buyer.name if profile.buyer else (company_name if profile.role == "ADMIN" else "ABC Industries")

    return UserProfileResponse(
        id=profile.id,
        supabase_user_id=profile.supabase_user_id,
        email=profile.email,
        full_name=profile.full_name,
        role=profile.role,
        company_id=profile.company_id,
        buyer_id=profile.buyer_id,
        company_name=company_name,
        buyer_name=buyer_name,
        created_at=profile.created_at
    )
