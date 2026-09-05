import json
from datetime import datetime, date
from fastapi import APIRouter, Depends, Request, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.services.razorpay_service import razorpay_service
from backend.services.payment_service import (
    import_payments,
    get_recent_payments,
    get_invoice_payments,
    record_payment
)
from backend.models.payment import PaymentAuditLog, Payment
from backend.models.invoice import Invoice
from backend.schemas.payment import (
    PaymentResponse,
    PaymentTimeline,
    PaymentImportResponse
)

router = APIRouter(tags=["payments"])


@router.post("/api/payments/import", response_model=PaymentImportResponse, summary="Import Payment Records")
def import_payment_records(
    source: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Import payment records through the service layer.
    In DEMO mode, loads synthetic payment records.
    In LIVE mode, fetches permitted transactions from Razorpay API.
    Normalizes both into the internal Payment model.
    """
    result = import_payments(db, source_override=source)
    return result


@router.get("/api/payments", response_model=list[PaymentResponse], summary="List Recent Payments")
def list_payments(
    status: str | None = None,
    source: str | None = None,
    buyer_id: int | None = None,
    invoice_id: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns recent payment records with optional filters.
    """
    return get_recent_payments(
        db,
        limit=limit,
        status=status,
        source=source,
        buyer_id=buyer_id,
        invoice_id=invoice_id
    )


@router.get("/api/invoices/{invoice_id}/payments", response_model=PaymentTimeline, summary="Get Invoice Payment Timeline")
def read_invoice_payments(
    invoice_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns the complete payment history timeline and outstanding calculation for an invoice.
    """
    return get_invoice_payments(db, invoice_id)


@router.post("/api/webhooks/razorpay", summary="Receive Razorpay Webhooks")
async def receive_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db)
):
    """
    Secure Webhook Receiver for Razorpay Events.
    - Strictly verifies HMAC-SHA256 signature using RAZORPAY_WEBHOOK_SECRET.
    - Idempotently processes supported payment lifecycle events.
    - Reconciles affected invoices.
    """
    body_bytes = await request.body()
    
    # 1. Signature Verification
    if not x_razorpay_signature:
        # Audit invalid attempt
        audit = PaymentAuditLog(
            event_type="WEBHOOK_INVALID",
            message="Webhook rejected: Missing 'X-Razorpay-Signature' header.",
            status="ERROR"
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing webhook signature header"
        )

    is_valid = razorpay_service.verify_webhook_signature(body_bytes, x_razorpay_signature)
    if not is_valid:
        audit = PaymentAuditLog(
            event_type="WEBHOOK_INVALID",
            message="Webhook rejected: Signature verification failed.",
            status="ERROR"
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )

    # 2. Parse Event Payload
    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON payload: {str(e)}"
        )

    event = payload.get("event", "")
    event_id = payload.get("id") or payload.get("entity", "")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    payment_id = payment_entity.get("id")

    # Supported Razorpay Events
    supported_events = {
        "payment.authorized": "PENDING",
        "payment.captured": "SUCCESS",
        "payment.failed": "FAILED",
        "refund.processed": "REFUNDED",
        "refund.created": "REFUNDED",
        "order.paid": "SUCCESS"
    }

    if event not in supported_events:
        # Safely log and ignore unsupported events
        audit = PaymentAuditLog(
            event_type="WEBHOOK_IGNORED",
            payment_id=payment_id,
            message=f"Ignored unsupported event type: '{event}'",
            status="INFO"
        )
        db.add(audit)
        db.commit()
        return {"status": "ignored", "event": event, "reason": "unsupported_event"}

    if not payment_id:
        return {"status": "ignored", "reason": "no_payment_id_in_payload"}

    # Extract invoice & buyer details
    notes = payment_entity.get("notes", {})
    invoice_id = notes.get("invoice_id")
    
    if not invoice_id:
        # Try to find invoice from order_id or notes
        audit = PaymentAuditLog(
            event_type="WEBHOOK_NO_INVOICE",
            payment_id=payment_id,
            message=f"Received {event} for {payment_id} but no invoice_id in notes.",
            status="WARNING"
        )
        db.add(audit)
        db.commit()
        return {"status": "recorded_without_invoice", "payment_id": payment_id}

    inv = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not inv:
        return {"status": "ignored", "reason": f"Invoice '{invoice_id}' not found"}

    norm_status = supported_events[event]
    amount = float(payment_entity.get("amount", 0)) / 100.0 if "amount" in payment_entity else inv.amount
    currency = payment_entity.get("currency", "INR")
    created_ts = payment_entity.get("created_at")
    payment_date = datetime.fromtimestamp(created_ts).date() if created_ts else date.today()

    # Record payment idempotently
    payment_data = {
        "payment_id": payment_id,
        "invoice_id": invoice_id,
        "buyer_id": inv.buyer_id,
        "amount": amount,
        "currency": currency,
        "status": norm_status,
        "payment_date": payment_date,
        "raw_metadata": json.dumps(payload)
    }

    payment = record_payment(db, payment_data, source="RAZORPAY")

    # Record Webhook audit
    audit = PaymentAuditLog(
        event_type="WEBHOOK_PROCESSED",
        payment_id=payment_id,
        invoice_id=invoice_id,
        message=f"Webhook event '{event}' processed successfully for payment {payment_id} (Status: {norm_status}).",
        status="SUCCESS"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "event": event,
        "payment_id": payment_id,
        "invoice_id": invoice_id,
        "payment_status": payment.status
    }
