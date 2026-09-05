"""
TermWise AI - Payment-Term Optimizer (Stage 4)

This module calculates the recommended negotiation terms (Target, Fallback, and
Maximum Acceptable terms) for outstanding invoices. It also simulates scenarios
of proposed terms (e.g. 30, 45, 60, 75, 90 days) to evaluate their risks and gap impacts.
"""

import math
import os
import sys
from datetime import date, datetime, timedelta

# Add backend directory to sys.path so we can import modules correctly
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.append(SCRIPT_DIR)

from payment_analysis import load_invoices, group_by_buyer, parse_date
from cash_flow_forecast import (
    analyze_and_forecast,
    detect_cash_flow_gaps,
    DEFAULT_EVALUATION_DATE,
    UPCOMING_EXPENSES_DEFAULT
)
from risk_opportunity_engine import (
    calculate_invoice_risk_score,
    calculate_invoice_cash_impact,
    calculate_invoice_opportunity,
    calculate_priority_score
)


def percentile(lst, p):
    """
    Calculate the p-th percentile of a list of numbers using linear interpolation.
    """
    if not lst:
        return 0.0
    sorted_lst = sorted(lst)
    idx = (len(sorted_lst) - 1) * p
    low = int(math.floor(idx))
    high = int(math.ceil(idx))
    if low == high:
        return sorted_lst[low]
    return sorted_lst[low] * (high - idx) + sorted_lst[high] * (idx - low)


def calculate_optimizer_metrics(buyer_name, invoices):
    """
    Calculate buyer stats including 25th and 75th percentiles of paid payment days.
    """
    paid = [inv for inv in invoices if inv["buyer_name"] == buyer_name and inv["payment_status"] == "Paid"]
    payment_days = []
    for inv in paid:
        actual_days = (inv["actual_payment_date"] - inv["invoice_date"]).days
        payment_days.append(actual_days)

    if not payment_days:
        return {
            "paid_count": 0,
            "min_days": None,
            "max_days": None,
            "p25": None,
            "p75": None
        }

    return {
        "paid_count": len(payment_days),
        "min_days": min(payment_days),
        "max_days": max(payment_days),
        "p25": percentile(payment_days, 0.25),
        "p75": percentile(payment_days, 0.75)
    }


def optimize_payment_terms(invoice, invoices, expenses=UPCOMING_EXPENSES_DEFAULT, today=DEFAULT_EVALUATION_DATE):
    """
    Calculate Target, Fallback, and Max Acceptable terms with evidence and confidence rating.
    """
    buyer_name = invoice["buyer_name"]
    current_term = invoice["agreed_payment_days"]

    # 1. Run forecast and gap detection
    unpaid_invoices, buyer_stats = analyze_and_forecast(invoices, today)
    gaps = detect_cash_flow_gaps(unpaid_invoices, expenses, today, "base")
    stats = buyer_stats[buyer_name]
    paid_count = stats["paid_count"]

    # Calculate percentiles
    metrics = calculate_optimizer_metrics(buyer_name, invoices)

    # Determine tolerable days before the first gap
    first_gap = gaps[0] if gaps else None
    if first_gap:
        tolerable_days = (first_gap["expense_date"] - invoice["invoice_date"]).days
        tolerable_days = max(15, tolerable_days)  # Clamp to at least 15 days for realism
    else:
        tolerable_days = 9999

    # 2. Calculate Confidence Level
    if paid_count >= 20:
        confidence = "HIGH"
        confidence_desc = "High confidence supported by a strong volume of historical buyer invoices."
    elif paid_count >= 8:
        confidence = "MEDIUM"
        confidence_desc = "Medium confidence with moderate buyer history available."
    else:
        confidence = "LOW"
        confidence_desc = "Low confidence because insufficient buyer payment history is available."

    # 3. Calculate Recommended Terms
    if paid_count < 3:
        # Insufficient data to optimize - default to current contract terms
        target_term = current_term
        fallback_term = current_term
        max_acceptable_term = min(90, current_term + 15)
        
        evidence = [
            "Buyer has insufficient payment history to optimize terms.",
            f"Defaults are set to the current agreed term of {current_term} days."
        ]
        tradeoff = "No optimization trade-off available due to lack of historical buyer payment data."
    else:
        min_days = metrics["min_days"]
        max_days = metrics["max_days"]
        p25 = metrics["p25"]
        p75 = metrics["p75"]
        median = stats["median_payment_days"]

        # Target term (optimistic but realistic)
        target_term = int(round(p25))
        if first_gap:
            target_term = min(target_term, tolerable_days)
        target_term = max(15, min(target_term, current_term))

        # Fallback term (median compromise)
        fallback_term = int(round(median))
        fallback_term = max(target_term, min(fallback_term, current_term))

        # Maximum Acceptable term (tolerable bounds)
        if first_gap:
            max_acceptable_term = min(current_term + 15, tolerable_days)
        else:
            max_acceptable_term = max(current_term, int(round(p75))) + 15
        max_acceptable_term = max(fallback_term, min(max_acceptable_term, 90))

        # Compile evidence
        evidence = [
            f"{paid_count} historical buyer payments analyzed.",
            f"Historical median payment days: {int(round(median))} days.",
            f"Historical typical range: {min_days}-{max_days} days (25th percentile: {int(round(p25))} days, 75th percentile: {int(round(p75))} days).",
            f"Late-payment rate: {stats['late_payment_rate']:.0f}%."
        ]

        if first_gap:
            evidence.append(
                f"SME cash requirement: within {tolerable_days} days from invoice date to cover "
                f"'{first_gap['expense_name']}' on {first_gap['expense_date'].strftime('%Y-%m-%d')}."
            )
            evidence.append(
                f"A term longer than {max_acceptable_term} days would increase projected cash-flow pressure and risk."
            )
        else:
            evidence.append("SME has healthy expected cash reserves (no current cash-flow gaps projected).")

        tradeoff = (
            f"Target term of {target_term} days provides better cash-flow protection but may be less aligned "
            f"with the buyer's slower payment pattern. Fallback term of {fallback_term} days is highly "
            f"consistent with the buyer's observed median behavior of {int(round(median))} days."
        )

    return {
        "target_term_days": target_term,
        "fallback_term_days": fallback_term,
        "maximum_acceptable_term_days": max_acceptable_term,
        "confidence": confidence,
        "confidence_reason": confidence_desc,
        "evidence": evidence,
        "tradeoff_explanation": tradeoff
    }


def simulate_payment_term(target_invoice_id, proposed_term, invoices, expenses=UPCOMING_EXPENSES_DEFAULT, today=DEFAULT_EVALUATION_DATE):
    """
    Simulate a proposed payment term for a specific outstanding invoice.
    Recalculates dates, risk level, and cash-flow gap consequences.
    """
    temp_invoices = []
    target_inv = None
    for inv in invoices:
        copied = inv.copy()
        if copied["invoice_id"] == target_invoice_id:
            copied["agreed_payment_days"] = proposed_term
            # Recalculate due date based on new proposed term
            copied["due_date"] = copied["invoice_date"] + timedelta(days=proposed_term)
            target_inv = copied
        temp_invoices.append(copied)

    if not target_inv:
        return None

    # Run forecasting and risk calculations on the temporary invoice dataset
    unpaid_pred, buyer_stats = analyze_and_forecast(temp_invoices, today)
    gaps = detect_cash_flow_gaps(unpaid_pred, expenses, today, "base")

    # Find the target invoice in the predicted queue
    sim_inv = next((item for item in unpaid_pred if item["invoice_id"] == target_invoice_id), None)
    if not sim_inv:
        return None

    total_expenses = sum(exp["amount"] for exp in expenses)
    # Determine gap contribution
    contributes_to_gap = False
    max_gap = 0.0
    if gaps:
        max_gap = max(g["gap_amount"] for g in gaps)
        for gap in gaps:
            if sim_inv["due_date"] <= gap["expense_date"] and sim_inv["predicted_payment_date"] > gap["expense_date"]:
                contributes_to_gap = True

    name = sim_inv["buyer_name"]
    stats = buyer_stats[name]
    risk_score, risk_level, _ = calculate_invoice_risk_score(sim_inv, stats, gaps, today)

    # Expected cash within 60 days (base scenario)
    within_60_cash = 0.0
    for item in unpaid_pred:
        days_to_est = (item["predicted_payment_date"] - today).days
        if days_to_est <= 60:
            within_60_cash += item["invoice_amount"]

    return {
        "term_days": proposed_term,
        "expected_payment_date": sim_inv["predicted_payment_date"],
        "expected_cash_within_60": within_60_cash,
        "max_cash_flow_gap": max_gap,
        "risk_level": risk_level,
        "risk_score": risk_score
    }


def main():
    """Command-line Demo for Payment-Term Optimizer (Stage 4)."""
    csv_path = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "sample_invoices.csv"))
    if not os.path.exists(csv_path):
        print(f"Error: Sample data not found at {csv_path}")
        return

    invoices = load_invoices(csv_path)
    today = DEFAULT_EVALUATION_DATE

    # Select target outstanding invoice: ABC Industries INV-1033 (amount 350,000, current term 60 days)
    target_invoice_id = "INV-1033"
    target_invoice = next((inv for inv in invoices if inv["invoice_id"] == target_invoice_id), None)

    if not target_invoice:
        print(f"Error: Target invoice {target_invoice_id} not found in sample dataset.")
        return

    recommendations = optimize_payment_terms(target_invoice, invoices, UPCOMING_EXPENSES_DEFAULT, today)

    # Run simulations for standard terms
    sim_terms = [30, 45, 60, 75, 90]
    simulations = []
    for term in sim_terms:
        sim = simulate_payment_term(target_invoice_id, term, invoices, UPCOMING_EXPENSES_DEFAULT, today)
        if sim:
            simulations.append(sim)

    # Output formatting
    print("=" * 55)
    print(" TERM WISE PAYMENT-TERM ANALYSIS (STAGE 4)")
    print("=" * 55)
    print(f"Buyer:                 {target_invoice['buyer_name']}")
    print(f"Invoice ID:            {target_invoice['invoice_id']}")
    print(f"Invoice Amount:        Rs. {target_invoice['invoice_amount']:,.2f}")
    print(f"Current Agreed Term:   {target_invoice['agreed_payment_days']} days")
    print("-" * 55)

    print("\nRECOMMENDED NEGOTIATION RANGE\n")
    print(f"  Target Term        : {recommendations['target_term_days']} days")
    print(f"  Fallback Term      : {recommendations['fallback_term_days']} days")
    print(f"  Max Acceptable Term: {recommendations['maximum_acceptable_term_days']} days (Modeled)")
    print(f"  Confidence Level   : {recommendations['confidence']}")
    print(f"  Confidence Reason  : {recommendations['confidence_reason']}")
    print("-" * 55)

    print("\nWHY?\n")
    for evidence_bullet in recommendations["evidence"]:
        print(f"  * {evidence_bullet}")
    print(f"\n  Trade-off Detail:\n    {recommendations['tradeoff_explanation']}")
    print("-" * 55)

    print("\nTERM SCENARIOS SIMULATION\n")
    print(f"{'Proposed Term':<13} | {'Expected Date':<13} | {'Cash within 60d':<16} | {'Max Cash Gap':<12} | {'Risk Level':<10}")
    print("-" * 75)
    for sim in simulations:
        print(
            f"{sim['term_days']:<4} days      | "
            f"{sim['expected_payment_date'].strftime('%Y-%m-%d'):<13} | "
            f"Rs. {sim['expected_cash_within_60']:<11,.0f} | "
            f"Rs. {sim['max_cash_flow_gap']:<8,.0f} | "
            f"{sim['risk_level']:<10} ({sim['risk_score']}/100)"
        )
    print("=" * 55)
    print("Disclaimer: TermWise calculates a recommended negotiation range based on")
    print("historical payment behavior and modeled cash-flow requirements. It is a")
    print("decision-support utility, not formal financial advice.")
    print("=" * 55)


if __name__ == "__main__":
    main()
