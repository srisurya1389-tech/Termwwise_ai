from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.buyer import BuyerResponse, BuyerDetailResponse
from backend.services import buyer_service

router = APIRouter(prefix="/api/buyers", tags=["buyers"])


@router.get("", response_model=list[BuyerResponse], summary="List Buyers")
def read_buyers(db: Session = Depends(get_db)):
    return buyer_service.get_buyers(db)


@router.get("/{buyer_id}", response_model=BuyerDetailResponse, summary="Get Buyer Detail and Calculations")
def read_buyer_detail(buyer_id: int, db: Session = Depends(get_db)):
    buyer = buyer_service.get_buyer_by_id(db, buyer_id)
    if not buyer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Buyer with ID {buyer_id} not found.")
        
    intelligence = buyer_service.calculate_buyer_intelligence(db, buyer)
    
    return {
        "id": buyer.id,
        "name": buyer.name,
        "created_at": buyer.created_at,
        "intelligence": intelligence
    }


@router.get("/{buyer_id}/payment-analysis", summary="Get Buyer Payment Settlement Analysis")
def read_buyer_payment_analysis(buyer_id: int, db: Session = Depends(get_db)):
    from backend.services.payment_service import get_buyer_payment_analysis
    buyer = buyer_service.get_buyer_by_id(db, buyer_id)
    if not buyer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Buyer with ID {buyer_id} not found.")
    return get_buyer_payment_analysis(db, buyer_id)

