"""
TermWise AI - Cash-Flow Forecast Engine (Stage 2)

This module estimates when an SME is likely to receive payments from outstanding
invoices based on historical buyer behavior.

It uses statistical metrics (median, min, max, std dev) from historical paid invoices
to define a deterministic and explainable expected payment window and confidence level.
"""

import math
import os
import sys
from datetime import date, datetime, timedelta

# Add backend directory to sys.path so we can import payment_analysis correctly
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.append(SCRIPT_DIR)

from payment_analysis import load_invoices, group_by_buyer, parse_date

# Define reference/evaluation date ("today") for consistent prototype outputs
DEFAULT_EVALUATION_DATE = date(2026, 8, 31)

# Default upcoming business expenses configuration
UPCOMING_EXPENSES_DEFAULT = [
    {
        "name": "Supplier Payments",
        "amount": 800000.0,
        "expected_date": "2026-09-10"
    },
    {
        "name": "Salaries",
        "amount": 400000.0,
        "expected_date": "2026-09-15"
    }
]


def calculate_buyer_stats(invoices):
    """
    Calculate historical payment metrics for a buyer using only paid invoices.
    Returns a dictionary of statistics.
    """
    paid = [inv for inv in invoices if inv["payment_status"] == "Paid"]
    total_paid = len(paid)

    # Calculate average agreed term across all invoices for context
    agreed_terms = [inv["agreed_payment_days"] for inv in invoices]
    avg_agreed_term = sum(agreed_terms) / len(agreed_terms) if invoices else 0.0

    if total_paid == 0:
        return {
            "paid_count": 0,
            "avg_payment_days": None,
            "median_payment_days": None,
            "min_payment_days": None,
            "max_payment_days": None,
            "std_payment_days": 0.0,
            "avg_agreed_term": round(avg_agreed_term, 1),
            "avg_delay": None,
            "late_payment_rate": None,
        }

    payment_days_list = []
    delay_list = []
    late_count = 0
    GRACE_PERIOD_DAYS = 5

    for inv in paid:
        actual_days = (inv["actual_payment_date"] - inv["invoice_date"]).days
        delay = (inv["actual_payment_date"] - inv["due_date"]).days
        payment_days_list.append(actual_days)
        delay_list.append(delay)
        if delay > GRACE_PERIOD_DAYS:
            late_count += 1

    # Median calculation
    sorted_days = sorted(payment_days_list)
    if total_paid % 2 == 1:
        median_val = sorted_days[total_paid // 2]
    else:
        median_val = (sorted_days[total_paid // 2 - 1] + sorted_days[total_paid // 2]) / 2.0

    avg_payment_days = sum(payment_days_list) / total_paid
    avg_delay = sum(delay_list) / total_paid
    late_rate = (late_count / total_paid) * 100

    # Standard deviation calculation
    if total_paid >= 2:
        variance = sum((x - avg_payment_days) ** 2 for x in payment_days_list) / (total_paid - 1)
        std_val = math.sqrt(variance)
    else:
        std_val = 0.0

    return {
        "paid_count": total_paid,
        "avg_payment_days": round(avg_payment_days, 1),
        "median_payment_days": round(median_val, 1),
        "min_payment_days": min(payment_days_list),
        "max_payment_days": max(payment_days_list),
        "std_payment_days": round(std_val, 1),
        "avg_agreed_term": round(avg_agreed_term, 1),
        "avg_delay": round(avg_delay, 1),
        "late_payment_rate": round(late_rate, 1),
    }


def predict_payment_window(stats, agreed_term):
    """
    Predict payment days and window based on historical buyer stats.
    Returns predicted days, range, confidence, and explainability text.
    """
    paid_count = stats["paid_count"]

    if paid_count < 3:
        return {
            "predicted_payment_days": agreed_term,
            "earliest_expected_days": agreed_term,
            "latest_expected_days": agreed_term + 30,
            "confidence_level": "LOW",
            "explanation": "Insufficient historical payment data."
        }

    # Prefer robust statistics like median
    predicted_payment_days = int(round(stats["median_payment_days"]))
    earliest_expected_days = stats["min_payment_days"]
    latest_expected_days = stats["max_payment_days"]

    # Provide a minimal buffer if the historical min and max payment days are identical
    if earliest_expected_days == latest_expected_days:
        earliest_expected_days = max(0, earliest_expected_days - 2)
        latest_expected_days = latest_expected_days + 2

    # Confidence based on historical volume
    if paid_count >= 5:
        confidence_level = "HIGH"
    else:
        confidence_level = "MEDIUM"

    explanation = (
        f"Prediction is based on {paid_count} historical payments. "
        f"The buyer's median payment time is {predicted_payment_days} days and "
        f"payments have historically ranged from {earliest_expected_days} to {latest_expected_days} days."
    )

    return {
        "predicted_payment_days": predicted_payment_days,
        "earliest_expected_days": earliest_expected_days,
        "latest_expected_days": latest_expected_days,
        "confidence_level": confidence_level,
        "explanation": explanation
    }


def predict_invoice_dates(invoice_date, prediction_window):
    """
    Calculate the expected payment dates using invoice_date and predicted/expected days.
    """
    predicted_days = prediction_window["predicted_payment_days"]
    earliest_days = prediction_window["earliest_expected_days"]
    latest_days = prediction_window["latest_expected_days"]

    predicted_payment_date = invoice_date + timedelta(days=predicted_days)
    earliest_expected_payment_date = invoice_date + timedelta(days=earliest_days)
    latest_expected_payment_date = invoice_date + timedelta(days=latest_days)

    return {
        "predicted_payment_date": predicted_payment_date,
        "earliest_expected_payment_date": earliest_expected_payment_date,
        "latest_expected_payment_date": latest_expected_payment_date
    }


def forecast_cash_inflow_by_scenario(unpaid_invoices_with_predictions, today, scenario="base"):
    """
    Groups outstanding invoices into expected cash-inflow periods (within 7, 15, 30, 60 days)
    under a specific scenario (optimistic, base, pessimistic).
    """
    date_key = {
        "optimistic": "earliest_expected_payment_date",
        "base": "predicted_payment_date",
        "pessimistic": "latest_expected_payment_date"
    }[scenario]

    within_7 = 0.0
    within_15 = 0.0
    within_30 = 0.0
    within_60 = 0.0

    for inv in unpaid_invoices_with_predictions:
        est_date = inv[date_key]
        days_to_est = (est_date - today).days

        amount = inv["invoice_amount"]
        # Cumulative grouping
        if days_to_est <= 7:
            within_7 += amount
        if days_to_est <= 15:
            within_15 += amount
        if days_to_est <= 30:
            within_30 += amount
        if days_to_est <= 60:
            within_60 += amount

    return {
        "within_7": within_7,
        "within_15": within_15,
        "within_30": within_30,
        "within_60": within_60
    }


def detect_cash_flow_gaps(unpaid_invoices_with_predictions, expenses, today, scenario="base"):
    """
    Compare expected incoming cash against expected expenses at each expense date.
    Identify potential cash-flow gaps and identify the main contributing reason.
    """
    parsed_expenses = []
    for exp in expenses:
        exp_date = parse_date(exp["expected_date"]) if isinstance(exp["expected_date"], str) else exp["expected_date"]
        parsed_expenses.append({
            "name": exp["name"],
            "amount": exp["amount"],
            "date": exp_date
        })

    # Sort expenses chronologically
    parsed_expenses.sort(key=lambda x: x["date"])

    date_key = {
        "optimistic": "earliest_expected_payment_date",
        "base": "predicted_payment_date",
        "pessimistic": "latest_expected_payment_date"
    }[scenario]

    gaps = []

    for exp in parsed_expenses:
        exp_date = exp["date"]

        # Cumulative expenses up to exp_date
        cum_expenses = sum(e["amount"] for e in parsed_expenses if e["date"] <= exp_date)

        # Cumulative predicted inflows up to exp_date
        cum_inflow = sum(inv["invoice_amount"] for inv in unpaid_invoices_with_predictions if inv[date_key] <= exp_date)

        net_cash = cum_inflow - cum_expenses
        if net_cash < 0:
            gap_amount = -net_cash

            # Identify the main contributing delayed invoice
            delayed_invoices = []
            for inv in unpaid_invoices_with_predictions:
                due_date = inv["due_date"]
                pred_date = inv[date_key]
                if due_date <= exp_date and pred_date > exp_date:
                    delayed_invoices.append(inv)

            reason = "High upcoming expenses relative to expected cash inflows."
            if delayed_invoices:
                # Find the one with the largest invoice amount
                largest_delayed = max(delayed_invoices, key=lambda x: x["invoice_amount"])
                pred_delay_days = (largest_delayed[date_key] - largest_delayed["due_date"]).days
                reason = (
                    f"Rs. {largest_delayed['invoice_amount']:,.0f} expected from {largest_delayed['buyer_name']} "
                    f"may arrive later than required. (Due date: {largest_delayed['due_date'].strftime('%Y-%m-%d')}, "
                    f"Predicted payment date: {largest_delayed[date_key].strftime('%Y-%m-%d')} "
                    f"[{pred_delay_days} days delay])"
                )

            gaps.append({
                "expense_name": exp["name"],
                "expense_date": exp_date,
                "gap_amount": gap_amount,
                "cumulative_expenses": cum_expenses,
                "cumulative_inflow": cum_inflow,
                "reason": reason
            })

    return gaps


def analyze_and_forecast(invoices, today=DEFAULT_EVALUATION_DATE):
    """
    Core function that integrates analysis, forecasting, and predictions.
    Returns list of unpaid invoices with predictions and buyer statistics.
    """
    buyers = group_by_buyer(invoices)
    buyer_stats = {name: calculate_buyer_stats(invs) for name, invs in buyers.items()}

    unpaid_invoices_with_predictions = []
    for inv in invoices:
        if inv["payment_status"] in ("Overdue", "Outstanding"):
            name = inv["buyer_name"]
            stats = buyer_stats[name]
            agreed_term = inv["agreed_payment_days"]

            window = predict_payment_window(stats, agreed_term)
            dates = predict_invoice_dates(inv["invoice_date"], window)

            # Combine records
            pred_inv = inv.copy()
            pred_inv.update(window)
            pred_inv.update(dates)
            unpaid_invoices_with_predictions.append(pred_inv)

    return unpaid_invoices_with_predictions, buyer_stats


def main():
    """Command-line Demo for TermWise Cash-Flow Forecast Engine."""
    csv_path = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "sample_invoices.csv"))
    if not os.path.exists(csv_path):
        print(f"Error: Sample data not found at {csv_path}")
        return

    invoices = load_invoices(csv_path)
    today = DEFAULT_EVALUATION_DATE

    unpaid_invoices, buyer_stats = analyze_and_forecast(invoices, today)

    # 1. Total Outstanding Cash
    total_outstanding = sum(inv["invoice_amount"] for inv in unpaid_invoices)

    # 2. Inflow Forecast Buckets by Scenario
    base_forecast = forecast_cash_inflow_by_scenario(unpaid_invoices, today, "base")
    opt_forecast = forecast_cash_inflow_by_scenario(unpaid_invoices, today, "optimistic")
    pess_forecast = forecast_cash_inflow_by_scenario(unpaid_invoices, today, "pessimistic")

    # 3. Gap Detection (Base Scenario)
    gaps = detect_cash_flow_gaps(unpaid_invoices, UPCOMING_EXPENSES_DEFAULT, today, "base")

    # Output formatting
    print("=" * 55)
    print(" TERM WISE CASH-FLOW FORECAST ENGINE (STAGE 2)")
    print("=" * 55)
    print(f"Evaluation Date (Today) : {today.strftime('%B %d, %Y')}")
    print(f"Total Unpaid Outstanding: Rs. {total_outstanding:,.2f}")
    print("-" * 55)

    print("\nEXPECTED CASH INFLOW PERIODS (BASE SCENARIO):")
    print(f"  Expected cash within 7 days : Rs. {base_forecast['within_7']:,.2f}")
    print(f"  Expected cash within 15 days: Rs. {base_forecast['within_15']:,.2f}")
    print(f"  Expected cash within 30 days: Rs. {base_forecast['within_30']:,.2f}")
    print(f"  Expected cash within 60 days: Rs. {base_forecast['within_60']:,.2f}")

    print("\nCASH-FLOW SCENARIOS COMPARISON:")
    print(f"{'Period':<15} | {'Optimistic':<12} | {'Base':<12} | {'Pessimistic':<12}")
    print("-" * 59)
    for p, bk in [("Within 7 Days", "within_7"), ("Within 15 Days", "within_15"),
                  ("Within 30 Days", "within_30"), ("Within 60 Days", "within_60")]:
        print(f"{p:<15} | Rs. {opt_forecast[bk]:<11,.0f} | Rs. {base_forecast[bk]:<11,.0f} | Rs. {pess_forecast[bk]:<11,.0f}")

    print("\nPOTENTIAL CASH-FLOW RISKS & GAPS:")
    if gaps:
        print("  Potential cash-flow risk: YES")
        for g in gaps:
            print(f"\n  * Gap of Rs. {g['gap_amount']:,.2f} expected around {g['expense_date'].strftime('%B %d, %Y')}")
            print(f"    Expense Event           : {g['expense_name']}")
            print(f"    Main contributing reason: {g['reason']}")
    else:
        print("  Potential cash-flow risk: NO (No gaps detected under base scenario)")

    print("\n" + "=" * 55)
    print(" BUYER FORECAST PROFILES")
    print("=" * 55)

    # Deduplicate unpaid invoices by buyer for showing buyer profiles
    buyer_unpaid = {}
    for inv in unpaid_invoices:
        buyer_unpaid.setdefault(inv["buyer_name"], []).append(inv)

    for buyer_name, invs in buyer_unpaid.items():
        stats = buyer_stats[buyer_name]
        print(f"\nBuyer: {buyer_name}")
        print(f"  Outstanding Amount  : Rs. {sum(i['invoice_amount'] for i in invs):,.2f} ({len(invs)} invoice(s))")
        # Display window information for one outstanding invoice
        sample_inv = invs[0]
        print(f"  Predicted Payment   : {sample_inv['predicted_payment_days']} days from invoice date")
        print(f"  Expected Range      : {sample_inv['earliest_expected_days']}-{sample_inv['latest_expected_days']} days")
        print(f"  Confidence Level    : {sample_inv['confidence_level']}")
        print(f"  Explanation         : {sample_inv['explanation']}")

    print("\n" + "=" * 55)


if __name__ == "__main__":
    main()
