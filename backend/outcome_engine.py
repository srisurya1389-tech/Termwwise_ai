"""
TermWise AI - Closed-Loop Outcome & Learning Engine (Stage 6)

This module implements the closed-loop feedback and learning engine.
It reads actual payment outcomes, compares them to predictions, updates
buyer behavior profiles dynamically (statistical learning/updating), and
measures prediction accuracy and system-wide financial improvements.
"""

import json
import os
import sys
from datetime import date, timedelta

# Add backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.append(SCRIPT_DIR)

from payment_analysis import load_invoices, group_by_buyer, parse_date


# --- Loader for Outcomes ---
def load_outcomes(filepath=None):
    """
    Load negotiation outcomes from JSON file.
    """
    if filepath is None:
        filepath = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "negotiation_outcomes.json"))
    
    if os.path.exists(filepath):
        with open(filepath) as f:
            return json.load(f)
    return []


# --- Feedback Loop: In-Memory Invoices Merger ---
def get_updated_invoices(csv_path, outcomes_path=None):
    """
    Loads base CSV invoices and merges them with negotiation outcomes.
    This creates an updated, statistically grounded invoice database for predictions.
    """
    invoices = load_invoices(csv_path)
    outcomes = load_outcomes(outcomes_path)

    outcome_map = {o["invoice_id"]: o for o in outcomes}
    updated_invoices = []
    seen_ids = set()

    for inv in invoices:
        inv_id = inv["invoice_id"]
        seen_ids.add(inv_id)
        if inv_id in outcome_map:
            out = outcome_map[inv_id]
            updated_inv = inv.copy()
            
            # Apply outcomes: If agreed and paid, mark status Paid and set final negotiated term
            if out.get("negotiation_status") == "AGREED":
                updated_inv["agreed_payment_days"] = out["final_agreed_term"]
                if out.get("actual_payment_days") is not None:
                    updated_inv["payment_status"] = "Paid"
                    # Calculate actual payment date based on invoice_date + actual_payment_days
                    inv_date = updated_inv["invoice_date"]
                    if isinstance(inv_date, str):
                        inv_date = parse_date(inv_date)
                    updated_inv["actual_payment_date"] = inv_date + timedelta(days=out["actual_payment_days"])
            elif out.get("negotiation_status") in ("REJECTED", "ESCALATED", "CLOSED"):
                # Negotiation failed or changed, but term is original
                pass
            
            updated_invoices.append(updated_inv)
        else:
            updated_invoices.append(inv)

    # Append new outcomes that are not in the base CSV
    for out in outcomes:
        inv_id = out["invoice_id"]
        if inv_id not in seen_ids:
            # Construct a synthetic invoice
            new_inv = {
                "buyer_name": out["buyer_name"],
                "invoice_id": inv_id,
                "invoice_amount": out["original_invoice_amount"],
                "agreed_payment_days": out["final_agreed_term"] if out["final_agreed_term"] is not None else out["original_payment_term"],
                "payment_status": "Paid" if (out["negotiation_status"] == "AGREED" and out["actual_payment_days"] is not None) else "Outstanding",
            }
            # Handle dates
            start_date = out.get("negotiation_start_date")
            if start_date:
                new_inv["invoice_date"] = parse_date(start_date)
            else:
                new_inv["invoice_date"] = date(2026, 8, 1) # Default fallback
            
            if out.get("actual_payment_days") is not None:
                new_inv["actual_payment_date"] = new_inv["invoice_date"] + timedelta(days=out["actual_payment_days"])
                
            updated_invoices.append(new_inv)

    return updated_invoices


# --- TermWise Outcome Score ---
def calculate_outcome_score(record):
    """
    Calculate the transparent 'TermWise Outcome Score' (0-100) based on four components:
    1. Negotiation status (30%)
    2. Payment term improvement (30%)
    3. Actual payment timing relative to prediction (20%)
    4. Cash-flow gap reduction (20%)
    """
    score = 0
    reasons = []

    # 1. Negotiation Success (30 points)
    status = record.get("negotiation_status", "ONGOING")
    if status == "AGREED":
        score += 30
        reasons.append("Negotiation succeeded (30 pts)")
    elif status == "REJECTED":
        score += 0
        reasons.append("Negotiation rejected by buyer (0 pts)")
    else:
        score += 15
        reasons.append(f"Negotiation status is {status} (15 pts)")

    # 2. Term Improvement (30 points)
    orig_term = record.get("original_payment_term", 90)
    agreed_term = record.get("final_agreed_term", None)
    if agreed_term is not None and agreed_term < orig_term:
        improvement = orig_term - agreed_term
        improvement_pts = min(30, improvement)
        score += improvement_pts
        reasons.append(f"Payment term improved by {improvement} days ({improvement_pts} pts)")
    else:
        score += 0
        reasons.append("No term improvement achieved (0 pts)")

    # 3. Actual Payment Timing (20 points)
    predicted = record.get("original_predicted_payment_days", None)
    actual = record.get("actual_payment_days", None)
    if actual is not None:
        if predicted is not None:
            if actual <= predicted:
                score += 20
                reasons.append(f"Payment arrived early/on prediction: {actual} vs {predicted} days (20 pts)")
            else:
                delay = actual - predicted
                timing_pts = max(0, 20 - delay)
                score += timing_pts
                reasons.append(f"Payment delayed by {delay} days relative to prediction ({timing_pts} pts)")
        else:
            score += 20
            reasons.append("Payment received (20 pts, prediction unavailable)")
    else:
        score += 0
        reasons.append("Payment not yet observed (0 pts)")

    # 4. Cash Flow Gap Reduction (20 points)
    gap_before = record.get("cash_flow_gap_before", None)
    gap_after = record.get("cash_flow_gap_after", None)
    if gap_before is None or gap_after is None:
        score += 20
        reasons.append("Cash flow gap impact data unavailable (20 pts, neutral)")
    elif gap_after < gap_before:
        score += 20
        reasons.append(f"Cash flow gap reduced from Rs. {gap_before:,.0f} to Rs. {gap_after:,.0f} (20 pts)")
    elif gap_before == 0.0 and gap_after == 0.0:
        score += 20
        reasons.append("Cash flow gap remained at zero (20 pts)")
    else:
        score += 0
        reasons.append(f"Cash flow gap did not improve: Rs. {gap_before:,.0f} vs Rs. {gap_after:,.0f} (0 pts)")

    return score, reasons


# --- Outcome Measurement ---
def calculate_outcome(record):
    """
    Compare original predictions and metrics with actual results.
    """
    orig_term = record.get("original_payment_term", 0)
    agreed_term = record.get("final_agreed_term", None)
    days_improved = orig_term - agreed_term if agreed_term is not None else 0

    predicted = record.get("original_predicted_payment_days", None)
    actual = record.get("actual_payment_days", None)
    prediction_error = actual - predicted if (actual is not None and predicted is not None) else None

    gap_before = record.get("cash_flow_gap_before", None)
    gap_after = record.get("cash_flow_gap_after", None)
    gap_improvement = gap_before - gap_after if (gap_before is not None and gap_after is not None) else None

    score, score_reasons = calculate_outcome_score(record)

    return {
        "buyer_name": record["buyer_name"],
        "invoice_id": record["invoice_id"],
        "original_payment_term": orig_term,
        "final_negotiated_term": agreed_term,
        "days_improved": days_improved,
        "predicted_payment_days": predicted,
        "actual_payment_days": actual,
        "prediction_error": prediction_error,
        "amount_received": record.get("payment_amount", 0.0),
        "cash_flow_gap_before": gap_before,
        "cash_flow_gap_after": gap_after,
        "cash_flow_gap_improvement": gap_improvement,
        "termwise_outcome_score": score,
        "score_reasons": score_reasons
    }


# --- Prediction Accuracy Calculator ---
def calculate_prediction_accuracy(outcomes):
    """
    Measure TermWise prediction accuracy metrics.
    """
    valid_predictions = [
        o for o in outcomes 
        if o.get("actual_payment_days") is not None and o.get("original_predicted_payment_days") is not None
    ]

    if not valid_predictions:
        return "Insufficient prediction history."

    errors = []
    abs_errors = []
    count = len(valid_predictions)

    for o in valid_predictions:
        err = o["actual_payment_days"] - o["original_predicted_payment_days"]
        errors.append(err)
        abs_errors.append(abs(err))

    mape = sum(abs_errors) / count
    avg_error = sum(errors) / count
    within_3 = sum(1 for e in abs_errors if e <= 3) / count * 100
    within_7 = sum(1 for e in abs_errors if e <= 7) / count * 100
    within_14 = sum(1 for e in abs_errors if e <= 14) / count * 100

    return {
        "total_observations": count,
        "mean_absolute_error_days": mape,
        "average_error_days": avg_error,
        "pct_within_3_days": within_3,
        "pct_within_7_days": within_7,
        "pct_within_14_days": within_14
    }


# --- System Performance Aggregator ---
def get_system_performance(invoices, outcomes):
    """
    Get system-wide historical observed outcome aggregates.
    """
    total_negotiations = len(outcomes)
    successful = sum(1 for o in outcomes if o.get("negotiation_status") == "AGREED")
    failed = sum(1 for o in outcomes if o.get("negotiation_status") == "REJECTED")
    observed_payments = sum(1 for o in outcomes if o.get("actual_payment_days") is not None)

    # Group unique invoice IDs across CSV and outcomes
    invoice_ids = {inv["invoice_id"] for inv in invoices}
    for out in outcomes:
        invoice_ids.add(out["invoice_id"])

    # Calculate average term improvement for successful runs
    successful_outcomes = [o for o in outcomes if o.get("negotiation_status") == "AGREED"]
    total_improvement = 0
    improvement_count = 0
    for o in successful_outcomes:
        orig = o.get("original_payment_term", 0)
        final = o.get("final_agreed_term", None)
        if final is not None:
            total_improvement += (orig - final)
            improvement_count += 1
    avg_improvement = total_improvement / improvement_count if improvement_count > 0 else 0.0

    # Prediction metrics
    accuracy = calculate_prediction_accuracy(outcomes)
    avg_pred_error = accuracy["mean_absolute_error_days"] if isinstance(accuracy, dict) else None
    pct_within_7 = accuracy["pct_within_7_days"] if isinstance(accuracy, dict) else None

    # Financial sums
    total_amount = sum(o["original_invoice_amount"] for o in outcomes)
    total_gap_improvement = 0.0
    for o in outcomes:
        before = o.get("cash_flow_gap_before")
        after = o.get("cash_flow_gap_after")
        if before is not None and after is not None:
            total_gap_improvement += (before - after)

    return {
        "total_invoices_analyzed": len(invoice_ids),
        "total_negotiations": total_negotiations,
        "successful_negotiations": successful,
        "failed_negotiations": failed,
        "total_payments_observed": observed_payments,
        "average_prediction_error": avg_pred_error,
        "predictions_within_7_days": pct_within_7,
        "average_payment_term_improvement": avg_improvement,
        "total_amount_affected": total_amount,
        "total_cash_flow_gap_improvement": total_gap_improvement
    }


# --- Buyer Learning Profile Getter ---
def get_buyer_learning_profile(buyer_name, invoices, outcomes):
    """
    Recalculate statistical behaviors and negotiation history for a specific buyer.
    """
    # Recalculate stats dynamically from merged invoices
    buyer_invoices = [inv for inv in invoices if inv["buyer_name"] == buyer_name]
    paid_invoices = [inv for inv in buyer_invoices if inv["payment_status"] == "Paid"]
    
    paid_count = len(paid_invoices)
    
    # Calculate average and median
    actual_days = []
    late_count = 0
    for inv in paid_invoices:
        # Calculate actual days from date difference
        inv_date = inv["invoice_date"]
        pay_date = inv["actual_payment_date"]
        if isinstance(inv_date, str):
            inv_date = parse_date(inv_date)
        if isinstance(pay_date, str):
            pay_date = parse_date(pay_date)
        
        diff = (pay_date - inv_date).days
        actual_days.append(diff)
        if diff > inv["agreed_payment_days"]:
            late_count += 1

    actual_days.sort()
    avg_payment = sum(actual_days) / paid_count if paid_count > 0 else 0.0
    
    # Median
    if paid_count > 0:
        mid = paid_count // 2
        if paid_count % 2 == 1:
            median_payment = actual_days[mid]
        else:
            median_payment = (actual_days[mid - 1] + actual_days[mid]) / 2.0
    else:
        median_payment = 0.0

    late_payment_rate = (late_count / paid_count * 100) if paid_count > 0 else 0.0

    # Negotiation outcomes for this buyer
    buyer_outcomes = [o for o in outcomes if o["buyer_name"] == buyer_name]
    total_negotiations = len(buyer_outcomes)
    successful = sum(1 for o in buyer_outcomes if o.get("negotiation_status") == "AGREED")
    
    # Negotiated improvements
    improvements = []
    for o in buyer_outcomes:
        if o.get("negotiation_status") == "AGREED" and o.get("final_agreed_term") is not None:
            improvements.append(o["original_payment_term"] - o["final_agreed_term"])
    avg_negotiated_improvement = sum(improvements) / len(improvements) if improvements else 0.0

    # Prediction accuracy specific to this buyer
    accuracy = calculate_prediction_accuracy(buyer_outcomes)
    pct_within_7 = accuracy["pct_within_7_days"] if isinstance(accuracy, dict) else None

    # Confidence rating based on updated paid count
    if paid_count >= 20:
        confidence = "HIGH"
    elif paid_count >= 8:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    return {
        "buyer_name": buyer_name,
        "total_invoices_analyzed": len(buyer_invoices),
        "average_payment_days": avg_payment,
        "median_payment_days": median_payment,
        "late_payment_rate": late_payment_rate,
        "total_negotiations": total_negotiations,
        "successful_negotiations": successful,
        "average_negotiated_improvement": avg_negotiated_improvement,
        "prediction_accuracy_within_7_days": pct_within_7,
        "current_confidence": confidence
    }


# --- Command Line Demo ---
def main():
    csv_path = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "sample_invoices.csv"))
    outcomes_path = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "negotiation_outcomes.json"))

    if not os.path.exists(csv_path) or not os.path.exists(outcomes_path):
        print("Error: Required data files not found.")
        return

    # Load outcomes and update database
    outcomes = load_outcomes(outcomes_path)
    invoices = get_updated_invoices(csv_path, outcomes_path)

    # 1. Output negotiation outcome for target invoice INV-102 (ABC Industries)
    abc_record = next((o for o in outcomes if o["invoice_id"] == "INV-102"), None)
    if not abc_record:
        print("Error: Synthetic INV-102 outcome record not found.")
        return

    results = calculate_outcome(abc_record)

    print("=" * 50)
    print(" TERM WISE OUTCOME ENGINE")
    print(" [SYNTHETIC DEMO OUTCOMES]")
    print("=" * 50)
    print("\nNEGOTIATION OUTCOME\n")
    print(f"Buyer:              {results['buyer_name']}")
    print(f"Invoice:            {results['invoice_id']}")
    print(f"Original Term:      {results['original_payment_term']} days")
    print(f"Negotiated Term:    {results['final_negotiated_term']} days")
    print(f"Actual Payment:     {results['actual_payment_days']} days")
    print("-" * 50)
    print("\nPAYMENT IMPROVEMENT\n")
    print(f"Term Improvement:   {results['days_improved']} days")
    print(f"Predicted Payment:  {results['predicted_payment_days']} days")
    print(f"Actual Payment:     {results['actual_payment_days']} days")
    print(f"Prediction Error:   {results['prediction_error']:+d} days" if results['prediction_error'] is not None else "Prediction Error:   N/A")
    print("-" * 50)
    print("\nCASH-FLOW IMPACT\n")
    if results['cash_flow_gap_before'] is not None and results['cash_flow_gap_after'] is not None:
        print(f"Before:             Rs. {results['cash_flow_gap_before']:,.2f} projected gap")
        print(f"After:              Rs. {results['cash_flow_gap_after']:,.2f} projected gap")
        print(f"Measured Imp:       Rs. {results['cash_flow_gap_improvement']:,.2f}")
    else:
        print("Insufficient data to calculate post-negotiation cash-flow impact.")
    print("-" * 50)
    print("\nOUTCOME SCORE\n")
    print(f"Status:             {abc_record['negotiation_status']}")
    print(f"Outcome Score:      {results['termwise_outcome_score']}/100")
    print("Score Breakdown:")
    for reason in results['score_reasons']:
        print(f"  * {reason}")

    # 2. Output System Performance Dashboard
    perf = get_system_performance(invoices, outcomes)
    print("\n" + "=" * 50)
    print(" SYSTEM PERFORMANCE DASHBOARD")
    print("=" * 50)
    print(f"Negotiations:       {perf['total_negotiations']}")
    print(f"Successful:         {perf['successful_negotiations']}")
    print(f"Failed:             {perf['failed_negotiations']}")
    print(f"Payments Observed:  {perf['total_payments_observed']}")
    print(f"Avg Prediction Err: {perf['average_prediction_error']:.1f} days" if perf['average_prediction_error'] is not None else "Avg Prediction Err: N/A")
    print(f"Preds within 7d:    {perf['predictions_within_7_days']:.1f}%" if perf['predictions_within_7_days'] is not None else "Preds within 7d:    N/A")
    print(f"Avg Term Imp:       {perf['average_payment_term_improvement']:.1f} days")
    print(f"Total Amt Affected: Rs. {perf['total_amount_affected']:,.2f}")
    print(f"Total Gap Imp:      Rs. {perf['total_cash_flow_gap_improvement']:,.2f}")
    print("=" * 50)
    print("Disclaimer: TermWise calculations are statistical. Actual payment profiles")
    print("are historical observed outcomes and do not guarantee future performance.")
    print("=" * 50)


if __name__ == "__main__":
    main()
