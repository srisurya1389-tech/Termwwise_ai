import json
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.models.payment import Payment, PaymentAuditLog
from backend.models.invoice import Invoice
from backend.models.buyer import Buyer
from backend.services.razorpay_service import razorpay_service
from backend.services.payment_reconciliation import reconcile_invoice, reconcile_all_invoices


def record_payment(db: Session, payment_data: dict, source: str = "DEMO") -> Payment:
    """
    Idempotently records or updates a payment record in the database,
    triggers invoice reconciliation, and writes to the audit log.
    """
    payment_id = payment_data["payment_id"].strip()
    invoice_id = payment_data["invoice_id"].strip()
    buyer_id = payment_data.get("buyer_id")
    amount = float(payment_data["amount"])
    currency = payment_data.get("currency", "INR")
    status = payment_data.get("status", "SUCCESS").upper()
    payment_date = payment_data.get("payment_date")
    raw_metadata = payment_data.get("raw_metadata")

    if isinstance(payment_date, str):
        try:
            payment_date = datetime.strptime(payment_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            payment_date = date.today()
    elif isinstance(payment_date, datetime):
        payment_date = payment_date.date()
    elif not payment_date:
        payment_date = date.today()

    # Resolve buyer_id from invoice if missing
    if not buyer_id:
        inv = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
        if inv:
            buyer_id = inv.buyer_id
        else:
            # Default to first buyer if available
            first_buyer = db.query(Buyer).first()
            buyer_id = first_buyer.id if first_buyer else 1

    # Check for existing payment (Idempotency)
    existing_payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()
    if existing_payment:
        # Update existing record if status or amount changed
        changed = False
        if existing_payment.status != status:
            existing_payment.status = status
            changed = True
        if existing_payment.amount != amount:
            existing_payment.amount = amount
            changed = True
        if changed:
            db.commit()
            db.refresh(existing_payment)
            reconcile_invoice(db, invoice_id)

        # Record idempotent audit note
        audit = PaymentAuditLog(
            event_type="PAYMENT_IDEMPOTENT_CHECK",
            payment_id=payment_id,
            invoice_id=invoice_id,
            message=f"Duplicate/Existing payment '{payment_id}' detected. Updated: {changed}.",
            status="INFO"
        )
        db.add(audit)
        db.commit()
        return existing_payment

    # Create new payment
    payment = Payment(
        payment_id=payment_id,
        invoice_id=invoice_id,
        buyer_id=buyer_id,
        amount=amount,
        currency=currency,
        status=status,
        payment_date=payment_date,
        source=source,
        raw_metadata=raw_metadata
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Log payment creation in audit
    audit = PaymentAuditLog(
        event_type="PAYMENT_IMPORTED",
        payment_id=payment_id,
        invoice_id=invoice_id,
        message=f"Payment {payment_id} (₹{amount:,.2f}, {status}) recorded from source '{source}' for invoice {invoice_id}.",
        status="SUCCESS"
    )
    db.add(audit)
    db.commit()

    # Trigger automatic reconciliation
    reconcile_invoice(db, invoice_id)

    return payment


def import_payments(db: Session, source_override: str | None = None) -> dict:
    """
    Imports payment records through the service layer.
    - If live Razorpay is configured and source is AUTO/RAZORPAY, imports from Razorpay API.
    - If DEMO mode, imports synthetic demo payments.
    - Normalizes both into the internal Payment model.
    """
    status_info = razorpay_service.get_status()
    is_live = status_info["mode"] == "LIVE" and source_override != "DEMO"
    source = "RAZORPAY" if is_live else "DEMO"

    imported_count = 0
    reconciled_invoices = set()

    if is_live:
        # Fetch from Razorpay API
        raw_items = razorpay_service.fetch_payments(count=50)
        for item in raw_items:
            notes = item.get("notes", {})
            invoice_id = notes.get("invoice_id")
            if not invoice_id:
                continue

            inv = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
            if not inv:
                continue

            status_map = {
                "captured": "SUCCESS",
                "failed": "FAILED",
                "refunded": "REFUNDED",
                "authorized": "PENDING"
            }
            rzp_status = item.get("status", "captured").lower()
            norm_status = status_map.get(rzp_status, "SUCCESS")

            created_ts = item.get("created_at")
            payment_date = datetime.fromtimestamp(created_ts).date() if created_ts else date.today()

            payment_data = {
                "payment_id": item["id"],
                "invoice_id": invoice_id,
                "buyer_id": inv.buyer_id,
                "amount": float(item["amount"]) / 100.0,
                "currency": item.get("currency", "INR"),
                "status": norm_status,
                "payment_date": payment_date,
                "raw_metadata": json.dumps(item)
            }
            record_payment(db, payment_data, source="RAZORPAY")
            imported_count += 1
            reconciled_invoices.add(invoice_id)
    else:
        # Demo synthetic payment data
        existing_invoices = db.query(Invoice).all()
        if existing_invoices:
            for i, inv in enumerate(existing_invoices):
                # Generate a demo payment for this invoice
                p_status = "SUCCESS" if inv.payment_status.lower() == "paid" or i % 3 != 0 else "PARTIAL"
                p_amount = inv.amount if p_status == "SUCCESS" else round(inv.amount * 0.5, 2)
                
                dp = {
                    "payment_id": f"demo_pay_{inv.invoice_id}_{i+1}",
                    "invoice_id": inv.invoice_id,
                    "buyer_id": inv.buyer_id,
                    "amount": p_amount,
                    "currency": "INR",
                    "status": "SUCCESS",
                    "payment_date": inv.actual_payment_date or inv.due_date or date.today()
                }
                record_payment(db, dp, source="DEMO")
                imported_count += 1
                reconciled_invoices.add(inv.invoice_id)
        else:
            # Fallback static list
            demo_payments = [
                {
                    "payment_id": "demo_pay_101",
                    "invoice_id": "INV-2024-001",
                    "amount": 250000.0,
                    "currency": "INR",
                    "status": "SUCCESS",
                    "payment_date": "2024-02-15"
                }
            ]
            for dp in demo_payments:
                record_payment(db, dp, source="DEMO")
                imported_count += 1
                reconciled_invoices.add(dp["invoice_id"])


    return {
        "status": "success",
        "imported_count": imported_count,
        "reconciled_invoices_count": len(reconciled_invoices),
        "mode": status_info["mode"],
        "source": source,
        "message": f"Successfully imported {imported_count} {source} payments across {len(reconciled_invoices)} invoices."
    }


def get_invoice_payments(db: Session, invoice_id: str) -> dict:
    """
    Returns the comprehensive payment timeline and settlement breakdown for an invoice.
    """
    invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not invoice:
        return {
            "invoice_id": invoice_id,
            "invoice_amount": 0.0,
            "total_received": 0.0,
            "outstanding_amount": 0.0,
            "payment_status": "Unknown",
            "payments": []
        }

    payments = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice_id)
        .order_by(Payment.payment_date.asc(), Payment.id.asc())
        .all()
    )

    successful = [p for p in payments if p.status.upper() == "SUCCESS"]
    total_received = sum(p.amount for p in successful)
    outstanding = max(0.0, invoice.amount - total_received)

    timeline_items = [
        {
            "payment_id": p.payment_id,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "payment_date": p.payment_date,
            "source": p.source
        }
        for p in payments
    ]

    return {
        "invoice_id": invoice.invoice_id,
        "invoice_amount": invoice.amount,
        "total_received": total_received,
        "outstanding_amount": outstanding,
        "payment_status": invoice.payment_status,
        "payments": timeline_items
    }


def get_buyer_payment_analysis(db: Session, buyer_id: int) -> dict:
    """
    Calculates detailed payment settlement statistics for a buyer:
    - Total paid & Total outstanding
    - Average and median payment days
    - Late payment count and percentage
    - Partial payment frequency
    - Number of successful payments
    """
    buyer = db.query(Buyer).filter(Buyer.id == buyer_id).first()
    if not buyer:
        return {
            "buyer_id": buyer_id,
            "buyer_name": "Unknown",
            "total_paid": 0.0,
            "total_outstanding": 0.0,
            "average_payment_days": 0.0,
            "median_payment_days": 0.0,
            "late_payment_count": 0,
            "late_payment_percentage": 0.0,
            "partial_payment_count": 0,
            "successful_payment_count": 0,
            "recent_payments": []
        }

    # Invoices for this buyer
    invoices = db.query(Invoice).filter(Invoice.buyer_id == buyer_id).all()
    
    # Payments for this buyer
    payments = (
        db.query(Payment)
        .filter(Payment.buyer_id == buyer_id)
        .order_by(desc(Payment.payment_date), desc(Payment.id))
        .all()
    )

    successful_payments = [p for p in payments if p.status.upper() == "SUCCESS"]
    total_paid = sum(p.amount for p in successful_payments)

    # Invoices analysis
    total_outstanding = 0.0
    partial_payment_count = 0
    for inv in invoices:
        inv_payments = [p for p in successful_payments if p.invoice_id == inv.invoice_id]
        inv_received = sum(p.amount for p in inv_payments)
        inv_outstanding = max(0.0, inv.amount - inv_received)
        total_outstanding += inv_outstanding
        if inv.payment_status.lower() in ("partially paid", "partially_paid"):
            partial_payment_count += 1

    # Payment timing statistics
    payment_days_list = []
    late_count = 0
    for inv in invoices:
        if inv.actual_payment_date and inv.invoice_date:
            days = (inv.actual_payment_date - inv.invoice_date).days
            payment_days_list.append(days)
            if inv.agreed_payment_days and days > (inv.agreed_payment_days + 5):
                late_count += 1

    import statistics
    avg_days = float(statistics.mean(payment_days_list)) if payment_days_list else 0.0
    median_days = float(statistics.median(payment_days_list)) if payment_days_list else 0.0
    late_pct = (late_count / len(payment_days_list) * 100.0) if payment_days_list else 0.0

    recent = [
        {
            "id": p.id,
            "payment_id": p.payment_id,
            "invoice_id": p.invoice_id,
            "buyer_id": p.buyer_id,
            "buyer_name": buyer.name,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "payment_date": p.payment_date,
            "created_at": p.created_at,
            "source": p.source
        }
        for p in payments[:10]
    ]

    return {
        "buyer_id": buyer.id,
        "buyer_name": buyer.name,
        "total_paid": round(total_paid, 2),
        "total_outstanding": round(total_outstanding, 2),
        "average_payment_days": round(avg_days, 1),
        "median_payment_days": round(median_days, 1),
        "late_payment_count": late_count,
        "late_payment_percentage": round(late_pct, 1),
        "partial_payment_count": partial_payment_count,
        "successful_payment_count": len(successful_payments),
        "recent_payments": recent
    }


def get_recent_payments(
    db: Session,
    limit: int = 10,
    status: str | None = None,
    source: str | None = None,
    buyer_id: int | None = None,
    invoice_id: str | None = None
) -> list[dict]:
    """
    Returns formatted recent payments list with optional filters.
    """
    query = db.query(Payment)
    if status:
        query = query.filter(Payment.status == status.upper())
    if source:
        query = query.filter(Payment.source == source.upper())
    if buyer_id:
        query = query.filter(Payment.buyer_id == buyer_id)
    if invoice_id:
        query = query.filter(Payment.invoice_id == invoice_id)

    payments = query.order_by(desc(Payment.payment_date), desc(Payment.id)).limit(limit).all()

    return [
        {
            "id": p.id,
            "payment_id": p.payment_id,
            "invoice_id": p.invoice_id,
            "buyer_id": p.buyer_id,
            "buyer_name": p.buyer_name,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "payment_date": p.payment_date,
            "created_at": p.created_at,
            "source": p.source
        }
        for p in payments
    ]


def get_audit_logs(db: Session, limit: int = 50) -> list[PaymentAuditLog]:
    """
    Returns latest audit logs.
    """
    return (
        db.query(PaymentAuditLog)
        .order_by(desc(PaymentAuditLog.created_at), desc(PaymentAuditLog.id))
        .limit(limit)
        .all()
    )
