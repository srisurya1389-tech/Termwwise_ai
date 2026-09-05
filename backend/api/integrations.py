from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.services.razorpay_service import razorpay_service
from backend.services.payment_service import get_audit_logs
from backend.schemas.integration import RazorpayStatusResponse, AuditLogResponse

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("/razorpay/status", response_model=RazorpayStatusResponse, summary="Get Razorpay Connection Status")
def get_razorpay_status():
    """
    Returns public-safe metadata regarding Razorpay integration configuration.
    Never exposes key secrets or tokens.
    """
    status_info = razorpay_service.get_status()
    return status_info


@router.get("/audit-logs", response_model=list[AuditLogResponse], summary="Get Payment & Integration Audit Logs")
def read_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns the latest integration and payment reconciliation audit log entries.
    """
    return get_audit_logs(db, limit=limit)
