from datetime import date
from sqlalchemy.orm import Session
from backend.models.invoice import Invoice
from backend.models.buyer import Buyer
from backend.models.negotiation import Negotiation
from backend.models.outcome import Outcome
from backend.outcome_engine import calculate_outcome, get_system_performance
from backend.services.negotiation_service import get_invoices_list
from backend.services.risk_service import get_prioritized_invoices
from backend.services.forecast_service import get_cash_flow_forecast
from backend.schemas.outcome import OutcomeCreate


def record_negotiation_outcome(db: Session, outcome_in: OutcomeCreate):
    negotiation = db.query(Negotiation).filter(Negotiation.id == outcome_in.negotiation_id).first()
    if not negotiation:
        return None

    invoice = db.query(Invoice).filter(Invoice.invoice_id == negotiation.invoice_id).first()
    if not invoice:
        return None

    invoices_list = get_invoices_list(db)
    
    # Try to find original prediction days
    from backend.cash_flow_forecast import analyze_and_forecast, DEFAULT_EVALUATION_DATE
    unpaid_forecasts, _ = analyze_and_forecast(invoices_list, DEFAULT_EVALUATION_DATE)
    
    pred_days = next(
        (f["expected_payment_days_base"] for f in unpaid_forecasts if f["invoice_id"] == invoice.invoice_id), 
        invoice.agreed_payment_days + 2
    )

    # Determine timing categories
    timing_outcome = "NO_OUTCOME"
    if negotiation.status == "AGREED":
        if outcome_in.actual_payment_days is not None:
            if outcome_in.actual_payment_days < pred_days:
                timing_outcome = "PAID_EARLIER"
            elif outcome_in.actual_payment_days <= pred_days + 3:
                timing_outcome = "PAID_AS_EXPECTED"
            else:
                timing_outcome = "PAID_LATE"
    elif negotiation.status == "REJECTED":
        timing_outcome = "NEGOTIATION_FAILED"

    # Assemble outcome record for outcome_engine analysis
    record = {
        "buyer_name": negotiation.buyer.name,
        "invoice_id": negotiation.invoice_id,
        "original_invoice_amount": invoice.amount,
        "original_payment_term": invoice.agreed_payment_days,
        "recommended_target_term": negotiation.target_term,
        "recommended_fallback_term": negotiation.fallback_term,
        "recommended_boundary": negotiation.boundary_term,
        "negotiation_start_date": negotiation.created_at.strftime("%Y-%m-%d"),
        "final_agreed_term": outcome_in.final_agreed_term,
        "negotiation_status": negotiation.status,
        "actual_payment_date": outcome_in.actual_payment_date.strftime("%Y-%m-%d") if outcome_in.actual_payment_date else None,
        "actual_payment_days": outcome_in.actual_payment_days,
        "original_predicted_payment_days": pred_days,
        "original_predicted_payment_window": f"{pred_days-3}-{pred_days+3}",
        "cash_flow_gap_before": outcome_in.cash_flow_gap_before,
        "cash_flow_gap_after": outcome_in.cash_flow_gap_after,
        "payment_amount": invoice.amount if (negotiation.status == "AGREED" and outcome_in.actual_payment_days is not None) else 0.0,
        "outcome": timing_outcome,
        "human_approved": True
    }

    # Run analytical calculations and score engine
    res = calculate_outcome(record)

    # Store outcome record in DB
    db_outcome = Outcome(
        negotiation_id=outcome_in.negotiation_id,
        invoice_id=negotiation.invoice_id,
        buyer_id=negotiation.buyer_id,
        final_agreed_term=outcome_in.final_agreed_term,
        actual_payment_date=outcome_in.actual_payment_date,
        actual_payment_days=outcome_in.actual_payment_days,
        predicted_payment_days=pred_days,
        prediction_error=res["prediction_error"],
        outcome=timing_outcome,
        cash_flow_gap_before=outcome_in.cash_flow_gap_before,
        cash_flow_gap_after=outcome_in.cash_flow_gap_after
    )
    db.add(db_outcome)

    # Enforce invoice updates in DB: Mark status Paid, override payment term, write actual payment date
    if negotiation.status == "AGREED":
        invoice.payment_status = "Paid"
        invoice.agreed_payment_days = outcome_in.final_agreed_term
        invoice.actual_payment_date = outcome_in.actual_payment_date
        db.add(invoice)

    db.commit()
    db.refresh(db_outcome)
    
    return db_outcome, res


def get_dashboard_summary(db: Session):
    invoices_list = get_invoices_list(db)
    
    # Load all DB outcomes
    db_outcomes = db.query(Outcome).all()
    outcomes_list = []
    for out in db_outcomes:
        inv = db.query(Invoice).filter(Invoice.invoice_id == out.invoice_id).first()
        inv_amount = inv.amount if inv else 100000.0
        orig_term = inv.agreed_payment_days if inv else 90
        buyer_name = out.buyer.name if out.buyer else (inv.buyer.name if inv and inv.buyer else "Unknown")
        status = out.negotiation.status if out.negotiation else "AGREED"
        outcomes_list.append({
            "buyer_name": buyer_name,
            "invoice_id": out.invoice_id,
            "original_invoice_amount": inv_amount,
            "original_payment_term": orig_term,
            "final_agreed_term": out.final_agreed_term,
            "negotiation_status": status,
            "actual_payment_days": out.actual_payment_days,
            "original_predicted_payment_days": out.predicted_payment_days,
            "cash_flow_gap_before": out.cash_flow_gap_before,
            "cash_flow_gap_after": out.cash_flow_gap_after,
        })

    # Run system performance calculator
    perf = get_system_performance(invoices_list, outcomes_list)
    
    # Forecast metrics
    forecast = get_cash_flow_forecast(db)
    
    # Priority summaries
    _, priority_summary = get_prioritized_invoices(db)

    # Active negotiations count
    active_negotiations = db.query(Negotiation).filter(Negotiation.status == "ONGOING").count()

    return {
        "total_outstanding": forecast["total_outstanding"],
        "expected_cash_7_days": forecast["expected_cash_7_days"],
        "expected_cash_30_days": forecast["expected_cash_30_days"],
        "potential_cash_flow_gap": forecast["potential_gaps"][0]["gap_amount"] if forecast["potential_gaps"] else 0.0,
        "high_risk_amount": priority_summary["high_risk_outstanding"],
        "high_priority_invoice_count": priority_summary["num_high_priority_invoices"],
        "active_negotiations": active_negotiations,
        "successful_negotiations": perf["successful_negotiations"],
        "average_prediction_error": perf["average_prediction_error"],
        "average_payment_term_improvement": perf["average_payment_term_improvement"]
    }
