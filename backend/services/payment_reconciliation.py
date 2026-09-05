from datetime import date
from sqlalchemy.orm import Session
from backend.models.invoice import Invoice
from backend.models.payment import Payment, PaymentAuditLog


def reconcile_invoice(db: Session, invoice_id: str) -> dict:
    """
    Reconciles all payment records for an invoice to compute received cash,
    outstanding balance, and update invoice status.

    Supported Statuses:
    - Paid (when total successful payments >= invoice amount)
    - Partially Paid (when 0 < total successful payments < invoice amount)
    - Overdue (when total payments == 0 and due_date < today or previously overdue)
    - Outstanding (when total payments == 0 and due_date >= today)
    """
    invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not invoice:
        return {"error": f"Invoice '{invoice_id}' not found"}

    # Fetch all payments for this invoice
    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).all()

    # Filter strictly successful payments
    successful_payments = [p for p in payments if p.status.upper() == "SUCCESS"]

    total_received = sum(p.amount for p in successful_payments)
    outstanding_amount = max(0.0, invoice.amount - total_received)

    old_status = invoice.payment_status

    if total_received >= invoice.amount:
        new_status = "Paid"
        # Set actual payment date to the most recent successful payment date
        if successful_payments:
            latest_date = max(p.payment_date for p in successful_payments)
            invoice.actual_payment_date = latest_date
    elif total_received > 0:
        new_status = "Partially Paid"
    else:
        # 0 received
        today = date.today()
        if invoice.due_date and invoice.due_date < today:
            new_status = "Overdue"
        else:
            new_status = "Outstanding"

    invoice.payment_status = new_status
    db.commit()
    db.refresh(invoice)

    # Log audit entry if status changed
    if old_status != new_status:
        audit = PaymentAuditLog(
            event_type="PAYMENT_RECONCILED",
            invoice_id=invoice_id,
            message=f"Invoice {invoice_id} reconciled: status changed from '{old_status}' to '{new_status}' (Total received: ₹{total_received:,.2f}, Outstanding: ₹{outstanding_amount:,.2f})",
            status="SUCCESS"
        )
        db.add(audit)
        db.commit()

    return {
        "invoice_id": invoice_id,
        "invoice_amount": invoice.amount,
        "total_received": total_received,
        "outstanding_amount": outstanding_amount,
        "payment_status": new_status,
        "payments_count": len(payments),
        "successful_payments_count": len(successful_payments)
    }


def reconcile_all_invoices(db: Session) -> int:
    """
    Reconciles all invoices in the database.
    """
    invoices = db.query(Invoice).all()
    count = 0
    for inv in invoices:
        reconcile_invoice(db, inv.invoice_id)
        count += 1
    return count
