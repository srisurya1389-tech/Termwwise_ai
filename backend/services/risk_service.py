from sqlalchemy.orm import Session
from backend.models.invoice import Invoice
from backend.risk_opportunity_engine import get_priority_queue, UPCOMING_EXPENSES_DEFAULT, DEFAULT_EVALUATION_DATE


def get_prioritized_invoices(db: Session, expenses=None, today=None):
    if expenses is None:
        expenses = UPCOMING_EXPENSES_DEFAULT
    if today is None:
        today = DEFAULT_EVALUATION_DATE

    # Load invoices from DB
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

    queue, gaps, buyer_stats = get_priority_queue(invoices_list, expenses, today)

    # Calculate statistics for the opportunity summary
    total_outstanding = sum(item["invoice_amount"] for item in queue)
    
    high_risk_queue = [item for item in queue if item["risk_level"] == "HIGH"]
    high_risk_outstanding = sum(item["invoice_amount"] for item in high_risk_queue)

    high_priority_queue = [item for item in queue if item["priority_score"] >= 70]
    num_high_priority = len(high_priority_queue)

    opp_invoices = [item for item in queue if item["opportunity_score"] >= 60]
    potential_opportunity_amount = sum(item["invoice_amount"] for item in opp_invoices)

    buyers_requiring_action = len(set(item["buyer_name"] for item in queue if item["priority_score"] >= 50))

    summary = {
        "total_outstanding": total_outstanding,
        "high_risk_outstanding": high_risk_outstanding,
        "num_high_priority_invoices": num_high_priority,
        "potential_opportunity_amount": potential_opportunity_amount,
        "buyers_requiring_action": buyers_requiring_action
    }

    return queue, summary
