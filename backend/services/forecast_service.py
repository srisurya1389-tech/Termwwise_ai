from sqlalchemy.orm import Session
from backend.models.invoice import Invoice
from backend.cash_flow_forecast import (
    analyze_and_forecast,
    detect_cash_flow_gaps,
    DEFAULT_EVALUATION_DATE,
    UPCOMING_EXPENSES_DEFAULT
)


def get_cash_flow_forecast(db: Session, expenses=None):
    if expenses is None:
        expenses = UPCOMING_EXPENSES_DEFAULT

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

    # Run analytical forecast
    unpaid_forecasts, buyer_profiles = analyze_and_forecast(invoices_list, DEFAULT_EVALUATION_DATE)
    gaps = detect_cash_flow_gaps(unpaid_forecasts, expenses, DEFAULT_EVALUATION_DATE)

    # Calculate bucketing totals (similar to cash_flow_forecast.py report)
    # expected cash within 7, 15, 30, 60 days
    expected_7_base = sum(f["invoice_amount"] for f in unpaid_forecasts if f["predicted_payment_days"] <= 7)
    expected_15_base = sum(f["invoice_amount"] for f in unpaid_forecasts if f["predicted_payment_days"] <= 15)
    expected_30_base = sum(f["invoice_amount"] for f in unpaid_forecasts if f["predicted_payment_days"] <= 30)
    expected_60_base = sum(f["invoice_amount"] for f in unpaid_forecasts if f["predicted_payment_days"] <= 60)

    expected_7_opt = sum(f["invoice_amount"] for f in unpaid_forecasts if f["earliest_expected_days"] <= 7)
    expected_15_opt = sum(f["invoice_amount"] for f in unpaid_forecasts if f["earliest_expected_days"] <= 15)
    expected_30_opt = sum(f["invoice_amount"] for f in unpaid_forecasts if f["earliest_expected_days"] <= 30)
    expected_60_opt = sum(f["invoice_amount"] for f in unpaid_forecasts if f["earliest_expected_days"] <= 60)

    expected_7_pess = sum(f["invoice_amount"] for f in unpaid_forecasts if f["latest_expected_days"] <= 7)
    expected_15_pess = sum(f["invoice_amount"] for f in unpaid_forecasts if f["latest_expected_days"] <= 15)
    expected_30_pess = sum(f["invoice_amount"] for f in unpaid_forecasts if f["latest_expected_days"] <= 30)
    expected_60_pess = sum(f["invoice_amount"] for f in unpaid_forecasts if f["latest_expected_days"] <= 60)

    total_outstanding = sum(inv["invoice_amount"] for inv in invoices_list if inv["payment_status"] in ("Outstanding", "Overdue"))

    return {
        "total_outstanding": total_outstanding,
        "expected_cash_7_days": expected_7_base,
        "expected_cash_15_days": expected_15_base,
        "expected_cash_30_days": expected_30_base,
        "expected_cash_60_days": expected_60_base,
        "scenarios": {
            "optimistic": {
                "within_7_days": expected_7_opt,
                "within_15_days": expected_15_opt,
                "within_30_days": expected_30_opt,
                "within_60_days": expected_60_opt
            },
            "base": {
                "within_7_days": expected_7_base,
                "within_15_days": expected_15_base,
                "within_30_days": expected_30_base,
                "within_60_days": expected_60_base
            },
            "pessimistic": {
                "within_7_days": expected_7_pess,
                "within_15_days": expected_15_pess,
                "within_30_days": expected_30_pess,
                "within_60_days": expected_60_pess
            }
        },
        "potential_gaps": gaps
    }
