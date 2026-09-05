from datetime import date
from sqlalchemy.orm import Session
from backend.models.invoice import Invoice
from backend.models.buyer import Buyer
from backend.schemas.invoice import InvoiceCreate, InvoiceUpdate


def get_invoices(db: Session, status: str | None = None, buyer_name: str | None = None):
    query = db.query(Invoice)
    if status:
        query = query.filter(Invoice.payment_status == status)
    if buyer_name:
        query = query.join(Buyer).filter(Buyer.name == buyer_name)
    return query.all()


def get_invoice_by_id(db: Session, invoice_id: str):
    return db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()


def create_invoice(db: Session, invoice_in: InvoiceCreate):
    # Ensure buyer exists
    buyer = db.query(Buyer).filter(Buyer.name == invoice_in.buyer_name).first()
    if not buyer:
        buyer = Buyer(name=invoice_in.buyer_name)
        db.add(buyer)
        db.commit()
        db.refresh(buyer)
        
    db_invoice = Invoice(
        invoice_id=invoice_in.invoice_id,
        buyer_id=buyer.id,
        amount=invoice_in.amount,
        invoice_date=invoice_in.invoice_date,
        agreed_payment_days=invoice_in.agreed_payment_days,
        due_date=invoice_in.due_date,
        payment_status="Outstanding"
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


def update_invoice(db: Session, db_invoice: Invoice, invoice_in: InvoiceUpdate):
    update_data = invoice_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_invoice, field, value)
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice
