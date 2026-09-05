from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.outcome import OutcomeCreate, OutcomeResponse
from backend.services import outcome_service

router = APIRouter(prefix="/api/outcomes", tags=["outcomes"])


@router.post("", response_model=OutcomeResponse, status_code=status.HTTP_201_CREATED, summary="Record Negotiation Outcome")
def record_outcome(outcome_in: OutcomeCreate, db: Session = Depends(get_db)):
    # Check if negotiation has valid completed status
    from backend.models.negotiation import Negotiation
    neg = db.query(Negotiation).filter(Negotiation.id == outcome_in.negotiation_id).first()
    if not neg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Negotiation with ID {outcome_in.negotiation_id} not found."
        )

    if neg.status not in ("AGREED", "REJECTED", "BOUNDARY_EXCEEDED", "ESCALATE", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot record outcome. Negotiation must be in a completed or escalated state (AGREED, REJECTED, etc.)."
        )

    db_outcome, res = outcome_service.record_negotiation_outcome(db, outcome_in)
    if not db_outcome:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Associated invoice or details not found."
        )

    return {
        "id": db_outcome.id,
        "negotiation_id": db_outcome.negotiation_id,
        "invoice_id": db_outcome.invoice_id,
        "buyer_id": db_outcome.buyer_id,
        "final_agreed_term": db_outcome.final_agreed_term,
        "actual_payment_date": db_outcome.actual_payment_date,
        "actual_payment_days": db_outcome.actual_payment_days,
        "predicted_payment_days": db_outcome.predicted_payment_days,
        "prediction_error": db_outcome.prediction_error,
        "outcome": db_outcome.outcome,
        "cash_flow_gap_before": db_outcome.cash_flow_gap_before,
        "cash_flow_gap_after": db_outcome.cash_flow_gap_after,
        "days_improved": res["days_improved"],
        "cash_flow_gap_improvement": res["cash_flow_gap_improvement"],
        "termwise_outcome_score": res["termwise_outcome_score"],
        "score_reasons": res["score_reasons"],
        "created_at": db_outcome.created_at
      }


@router.get("", response_model=list[OutcomeResponse], summary="List All Outcomes")
def read_outcomes(db: Session = Depends(get_db)):
    from backend.models.outcome import Outcome
    from backend.outcome_engine import calculate_outcome
    
    db_outcomes = db.query(Outcome).all()
    results = []
    
    for out in db_outcomes:
        # Re-compile outcome record for score calculations
        record = {
            "buyer_name": out.buyer.name,
            "invoice_id": out.invoice_id,
            "original_invoice_amount": 100000.0,  # fallback
            "original_payment_term": out.negotiation.target_term,
            "recommended_target_term": out.negotiation.target_term,
            "recommended_fallback_term": out.negotiation.fallback_term,
            "recommended_boundary": out.negotiation.boundary_term,
            "negotiation_start_date": out.negotiation.created_at.strftime("%Y-%m-%d"),
            "final_agreed_term": out.final_agreed_term,
            "negotiation_status": out.negotiation.status,
            "actual_payment_date": out.actual_payment_date.strftime("%Y-%m-%d") if out.actual_payment_date else None,
            "actual_payment_days": out.actual_payment_days,
            "original_predicted_payment_days": out.predicted_payment_days,
            "cash_flow_gap_before": out.cash_flow_gap_before,
            "cash_flow_gap_after": out.cash_flow_gap_after,
            "payment_amount": 100000.0,
            "outcome": out.outcome
        }
        res = calculate_outcome(record)
        
        results.append({
            "id": out.id,
            "negotiation_id": out.negotiation_id,
            "invoice_id": out.invoice_id,
            "buyer_id": out.buyer_id,
            "final_agreed_term": out.final_agreed_term,
            "actual_payment_date": out.actual_payment_date,
            "actual_payment_days": out.actual_payment_days,
            "predicted_payment_days": out.predicted_payment_days,
            "prediction_error": out.prediction_error,
            "outcome": out.outcome,
            "cash_flow_gap_before": out.cash_flow_gap_before,
            "cash_flow_gap_after": out.cash_flow_gap_after,
            "days_improved": res["days_improved"],
            "cash_flow_gap_improvement": res["cash_flow_gap_improvement"],
            "termwise_outcome_score": res["termwise_outcome_score"],
            "score_reasons": res["score_reasons"],
            "created_at": out.created_at
        })
        
    return results

