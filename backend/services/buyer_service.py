from sqlalchemy.orm import Session
from backend.models.buyer import Buyer
from backend.models.invoice import Invoice
from backend.payment_analysis import group_by_buyer
from backend.cash_flow_forecast import analyze_and_forecast, DEFAULT_EVALUATION_DATE


def get_buyers(db: Session):
    return db.query(Buyer).all()


def get_buyer_by_id(db: Session, buyer_id: int):
    return db.query(Buyer).filter(Buyer.id == buyer_id).first()


def calculate_buyer_intelligence(db: Session, buyer: Buyer):
    # 1. Fetch all invoices from DB to ensure profile updates are dynamically computed
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

    # 2. Run payment intelligence grouping and analysis
    from backend.payment_analysis import analyze_buyer
    buyer_profiles = group_by_buyer(invoices_list)
    buyer_invoices = buyer_profiles.get(buyer.name, [])
    if buyer_invoices:
        stats = analyze_buyer(buyer.name, buyer_invoices)
    else:
        stats = {
            "avg_payment_days": 0.0,
            "late_payment_rate": 0.0,
            "risk": "LOW"
        }

    # Outstanding sum for this buyer
    outstanding_sum = sum(
        inv["invoice_amount"] 
        for inv in invoices_list 
        if inv["buyer_name"] == buyer.name and inv["payment_status"] in ("Outstanding", "Overdue")
    )

    # Invoice count for this buyer
    buyer_invoices_count = sum(1 for inv in invoices_list if inv["buyer_name"] == buyer.name)

    # 3. Run predictions
    unpaid_forecasts, buyer_forecast_profiles = analyze_and_forecast(invoices_list, DEFAULT_EVALUATION_DATE)
    forecast_profile = buyer_forecast_profiles.get(buyer.name, None)

    pred_days = None
    pred_window = None
    confidence = None

    if forecast_profile:
        # If sufficient history exists, retrieve predicted values
        pred_days = forecast_profile.get("predicted_payment_days", None)
        min_window = forecast_profile.get("expected_min_days", None)
        max_window = forecast_profile.get("expected_max_days", None)
        if min_window is not None and max_window is not None:
            pred_window = f"{min_window}-{max_window}"
        confidence = forecast_profile.get("confidence", "LOW")

    # Median payment days
    # To compute median, extract actual payment days for paid invoices
    buyer_paid = [
        inv for inv in invoices_list 
        if inv["buyer_name"] == buyer.name and inv["payment_status"] == "Paid"
    ]
    actual_days = []
    for inv in buyer_paid:
        diff = (inv["actual_payment_date"] - inv["invoice_date"]).days
        actual_days.append(diff)
    
    actual_days.sort()
    n = len(actual_days)
    if n > 0:
        mid = n // 2
        if n % 2 == 1:
            median_payment = float(actual_days[mid])
        else:
            median_payment = float(actual_days[mid - 1] + actual_days[mid]) / 2.0
    else:
        median_payment = 0.0

    return {
        "invoice_count": buyer_invoices_count,
        "average_payment_days": stats.get("avg_payment_days") or 0.0,
        "median_payment_days": median_payment,
        "late_payment_percentage": stats.get("late_payment_rate") or 0.0,
        "risk_level": stats.get("risk", "LOW"),
        "outstanding_amount": outstanding_sum,
        "predicted_payment_days": pred_days,
        "predicted_payment_window": pred_window,
        "confidence": confidence
    }
