from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from backend.services import invoice_service, negotiation_service

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceResponse], summary="List Invoices", description="Retrieve all invoices with optional status and buyer filtering.")
def read_invoices(
    status: str | None = Query(None, description="Filter by payment status (Paid, Outstanding, Overdue)"),
    buyer_name: str | None = Query(None, description="Filter by buyer company name"),
    db: Session = Depends(get_db)
):
    return invoice_service.get_invoices(db, status=status, buyer_name=buyer_name)


@router.get("/{invoice_id}", response_model=InvoiceResponse, summary="Get Invoice Details")
def read_invoice(invoice_id: str, db: Session = Depends(get_db)):
    db_invoice = invoice_service.get_invoice_by_id(db, invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Invoice '{invoice_id}' not found.")
    return db_invoice


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED, summary="Create Invoice")
def create_invoice(invoice_in: InvoiceCreate, db: Session = Depends(get_db)):
    # Check if duplicate invoice exists
    existing = invoice_service.get_invoice_by_id(db, invoice_in.invoice_id)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invoice ID '{invoice_in.invoice_id}' already exists.")
    return invoice_service.create_invoice(db, invoice_in)


@router.put("/{invoice_id}", response_model=InvoiceResponse, summary="Update Invoice")
def update_invoice(invoice_id: str, invoice_in: InvoiceUpdate, db: Session = Depends(get_db)):
    db_invoice = invoice_service.get_invoice_by_id(db, invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Invoice '{invoice_id}' not found.")
    return invoice_service.update_invoice(db, db_invoice, invoice_in)


@router.get("/{invoice_id}/term-analysis", summary="Get Payment Term Negotiation Limits")
def analyze_payment_term(invoice_id: str, db: Session = Depends(get_db)):
    db_invoice = invoice_service.get_invoice_by_id(db, invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Invoice '{invoice_id}' not found.")
        
    analysis = negotiation_service.get_term_analysis(db, invoice_id)
    return analysis
