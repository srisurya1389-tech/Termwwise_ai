from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.negotiation import NegotiationCreate, NegotiationResponse, ResponseInput, ResponseAnalysisResponse
from backend.services import negotiation_service

from backend.models.negotiation import Negotiation

router = APIRouter(prefix="/api/negotiations", tags=["negotiations"])


@router.get("", response_model=list[NegotiationResponse], summary="List All Negotiations")
def read_negotiations(db: Session = Depends(get_db)):
    return db.query(Negotiation).all()


@router.get("/{negotiation_id}", response_model=NegotiationResponse, summary="Get Negotiation Details")
def read_negotiation(negotiation_id: int, db: Session = Depends(get_db)):
    neg = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not neg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Negotiation with ID {negotiation_id} not found.")
    return neg



@router.post("", response_model=NegotiationResponse, status_code=status.HTTP_201_CREATED, summary="Start Negotiation")
def create_negotiation(negotiation_in: NegotiationCreate, db: Session = Depends(get_db)):
    neg = negotiation_service.start_negotiation(db, negotiation_in.invoice_id)
    if not neg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Invoice '{negotiation_in.invoice_id}' not found. Cannot start negotiation."
        )
    return neg


@router.post("/{negotiation_id}/response", response_model=ResponseAnalysisResponse, summary="Analyze Buyer Response")
def analyze_response(negotiation_id: int, response_in: ResponseInput, db: Session = Depends(get_db)):
    result = negotiation_service.analyze_negotiation_response(db, negotiation_id, response_in.buyer_message)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Negotiation with ID {negotiation_id} not found."
        )
    return {
        "category": result["analysis_details"]["category"],
        "detected_term_days": result["analysis_details"]["detected_term_days"],
        "negotiation_status": result["analysis_details"]["negotiation_status"],
        "recommended_action": result["analysis_details"]["recommended_action"],
        "action_details": result["analysis_details"]["action_details"],
        "reasoning": result["analysis_details"]["reasoning"]
    }


@router.post("/{negotiation_id}/approve", response_model=NegotiationResponse, summary="Approve Strategy Message")
def approve_negotiation(negotiation_id: int, db: Session = Depends(get_db)):
    neg = negotiation_service.update_negotiation_approval(db, negotiation_id, "APPROVED")
    if not neg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Negotiation with ID {negotiation_id} not found.")
    return neg


@router.post("/{negotiation_id}/reject", response_model=NegotiationResponse, summary="Reject Strategy Message")
def reject_negotiation(negotiation_id: int, db: Session = Depends(get_db)):
    neg = negotiation_service.update_negotiation_approval(db, negotiation_id, "REJECTED")
    if not neg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Negotiation with ID {negotiation_id} not found.")
    return neg


@router.post("/{negotiation_id}/edit", response_model=NegotiationResponse, summary="Edit Strategy Message")
def edit_negotiation(negotiation_id: int, db: Session = Depends(get_db)):
    neg = negotiation_service.update_negotiation_approval(db, negotiation_id, "EDITED")
    if not neg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Negotiation with ID {negotiation_id} not found.")
    return neg
