from datetime import date
from sqlalchemy.orm import Session
from backend.models.invoice import Invoice
from backend.models.buyer import Buyer
from backend.models.negotiation import Negotiation
from backend.payment_term_optimizer import optimize_payment_terms, simulate_payment_term, UPCOMING_EXPENSES_DEFAULT, DEFAULT_EVALUATION_DATE
from backend.negotiation_agent import (
    compile_negotiation_context,
    get_llm_provider,
    generate_negotiation_strategy,
    generate_negotiation_message,
    analyze_buyer_response
)


def get_invoices_list(db: Session):
    db_invoices = db.query(Invoice).all()
    invoices_list = []
    for inv in db_invoices:
        invoices_list.append({
            "buyer_name": inv.buyer.name,
            "invoice_id": inv.invoice_id,
            "invoice_amount": inv.amount,
            "agreed_payment_days": inv.agreed_payment_days,
            "payment_status": inv.payment_status,
            "invoice_date": inv.invoice_date,
            "actual_payment_date": inv.actual_payment_date,
            "due_date": inv.due_date
        })
    return invoices_list


def get_term_analysis(db: Session, invoice_id: str):
    db_invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not db_invoice:
        return None

    invoices_list = get_invoices_list(db)
    
    # Map target invoice dict
    inv_dict = {
        "buyer_name": db_invoice.buyer.name,
        "invoice_id": db_invoice.invoice_id,
        "invoice_amount": db_invoice.amount,
        "agreed_payment_days": db_invoice.agreed_payment_days,
        "payment_status": db_invoice.payment_status,
        "invoice_date": db_invoice.invoice_date,
        "due_date": db_invoice.due_date
    }

    opt_results = optimize_payment_terms(inv_dict, invoices_list, UPCOMING_EXPENSES_DEFAULT, DEFAULT_EVALUATION_DATE)

    # Compile simulated scenarios
    scenarios = []
    for term in [30, 45, 60, 75, 90]:
        sim = simulate_payment_term(invoice_id, term, invoices_list, UPCOMING_EXPENSES_DEFAULT, DEFAULT_EVALUATION_DATE)
        scenarios.append({
            "proposed_term": term,
            "expected_payment_date": sim["expected_payment_date"].strftime("%Y-%m-%d"),
            "cash_within_60_days": sim["expected_cash_within_60"],
            "max_cash_flow_gap": sim["max_cash_flow_gap"],
            "risk_score": sim["risk_score"],
            "risk_level": sim["risk_level"]
        })

    return {
        "invoice_id": invoice_id,
        "current_agreed_term_days": db_invoice.agreed_payment_days,
        "recommended_target_term_days": opt_results["target_term_days"],
        "recommended_fallback_term_days": opt_results["fallback_term_days"],
        "maximum_acceptable_term_days": opt_results["maximum_acceptable_term_days"],
        "confidence": opt_results["confidence"],
        "evidence": opt_results["evidence"],
        "scenario_comparison": scenarios
    }


def start_negotiation(db: Session, invoice_id: str):
    db_invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not db_invoice:
        return None

    invoices_list = get_invoices_list(db)

    inv_dict = {
        "buyer_name": db_invoice.buyer.name,
        "invoice_id": db_invoice.invoice_id,
        "invoice_amount": db_invoice.amount,
        "agreed_payment_days": db_invoice.agreed_payment_days,
        "payment_status": db_invoice.payment_status,
        "invoice_date": db_invoice.invoice_date,
        "due_date": db_invoice.due_date
    }

    # Compile context and run strategy generation
    context = compile_negotiation_context(inv_dict, invoices_list, UPCOMING_EXPENSES_DEFAULT, DEFAULT_EVALUATION_DATE)
    provider = get_llm_provider()

    strategy_text = generate_negotiation_strategy(provider, context)
    message_text = generate_negotiation_message(provider, context)

    negotiation = Negotiation(
        invoice_id=invoice_id,
        buyer_id=db_invoice.buyer_id,
        round=1,
        status="INITIAL",
        target_term=context["target_term"],
        fallback_term=context["fallback_term"],
        boundary_term=context["max_acceptable_term"],
        buyer_latest_offer=None,
        strategy=strategy_text,
        message=message_text,
        approval_status="PENDING"
    )
    db.add(negotiation)
    db.commit()
    db.refresh(negotiation)
    return negotiation


def analyze_negotiation_response(db: Session, negotiation_id: int, buyer_message: str):
    negotiation = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not negotiation:
        return None

    # Construct state dictionary for standard response analyzer
    state = {
        "round": negotiation.round,
        "our_target": negotiation.target_term,
        "our_fallback": negotiation.fallback_term,
        "our_boundary": negotiation.boundary_term,
        "buyer_latest_offer": negotiation.buyer_latest_offer,
        "status": negotiation.status
    }

    provider = get_llm_provider()
    analysis = analyze_buyer_response(provider, state, buyer_message)

    # Update negotiation record
    negotiation.round += 1
    negotiation.status = analysis["negotiation_status"]
    
    detected = analysis["detected_term_days"]
    if detected is not None:
        negotiation.buyer_latest_offer = detected

    # Log response in messages
    negotiation.message = (
        f"{negotiation.message}\n\n"
        f"--- Round {state['round']} Buyer Response ---\n"
        f"\"{buyer_message}\"\n"
        f"Classified: {analysis['category']} (Detected: {detected if detected else 'None'} days)\n"
        f"AI Rationale: {analysis['reasoning']}\n"
        f"Recommended Action: {analysis['recommended_action']}"
    )

    db.add(negotiation)
    db.commit()
    db.refresh(negotiation)
    
    return {
        "negotiation": negotiation,
        "analysis_details": analysis
    }


def update_negotiation_approval(db: Session, negotiation_id: int, approval_status: str):
    negotiation = db.query(Negotiation).filter(Negotiation.id == negotiation_id).first()
    if not negotiation:
        return None
    negotiation.approval_status = approval_status
    db.add(negotiation)
    db.commit()
    db.refresh(negotiation)
    return negotiation
