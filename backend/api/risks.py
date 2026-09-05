from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.services import risk_service

router = APIRouter(prefix="/api/priorities", tags=["priorities"])


@router.get("", summary="Get Prioritized Invoices Queue")
def get_priorities(db: Session = Depends(get_db)):
    queue, summary = risk_service.get_prioritized_invoices(db)
    return {
        "summary": summary,
        "queue": queue
    }
