"""
TermWise AI - Risk & Opportunity Engine (Stage 3)

This module evaluates outstanding invoices to help the SME owner identify which
invoices and buyers require immediate attention, why, and the financial impact.

It calculates Risk, Cash-Flow Impact, Opportunity, and a combined Priority Score
using deterministic, explainable mathematical models.
"""

import os
import sys
from datetime import date, datetime

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


def calculate_invoice_risk_score(invoice, stats, gaps, today):
    """
    Calculate a deterministic risk score (0-100) and risk level for an outstanding invoice.
    Considers buyer statistics, timeline proximity, volatility, and gap alignment.
    """
    paid_count = stats["paid_count"]

    # 1. Late Payment Rate Factor (Weight: 25%)
    if paid_count > 0:
        late_rate_factor = stats["late_payment_rate"]
    else:
        late_rate_factor = 50.0  # Medium default for no history

    # 2. Historical Delay Factor (Weight: 25%)
    if paid_count > 0:
        avg_delay = stats["avg_delay"]
        # Scale delay: 4 points per day, maxing out at 25 days delay (score 100)
        hist_delay_factor = min(100.0, max(0.0, avg_delay * 4.0))
    else:
        hist_delay_factor = 30.0  # Safe default for no history

    # 3. Proximity to Due Date Factor (Weight: 25%)
    days_to_due = (invoice["due_date"] - today).days
    if days_to_due <= 0:
        proximity_factor = 100.0  # Already due or overdue
    elif days_to_due <= 30:
        # Linearly scales from 25 to 100 as the due date gets closer
        proximity_factor = 100.0 - (days_to_due * 2.5)
    else:
        # Decays from 25 to 0
        proximity_factor = max(0.0, 25.0 - (days_to_due - 30) * 0.5)

    # 4. Payment Consistency/Volatility Factor (Weight: 15%)
    if paid_count >= 3:
        std_val = stats.get("std_payment_days", 0.0)
        # Higher std dev means higher inconsistency. 5 points per day, max 20 days.
        consistency_factor = min(100.0, std_val * 5.0)
    else:
        consistency_factor = 50.0  # Medium default for low history

    # 5. Gap Impact Factor (Weight: 10%)
    contributes_to_gap = False
    for gap in gaps:
        # Check if invoice was due before the gap but predicted to arrive after it
        if invoice["due_date"] <= gap["expense_date"] and invoice["predicted_payment_date"] > gap["expense_date"]:
            contributes_to_gap = True
            break
    
    gap_factor = 100.0 if contributes_to_gap else 0.0

    # Combine weighted factors
    risk_score = (
        0.25 * late_rate_factor +
        0.25 * hist_delay_factor +
        0.25 * proximity_factor +
        0.15 * consistency_factor +
        0.10 * gap_factor
    )

    risk_score = int(round(risk_score))
    risk_score = max(0, min(100, risk_score))

    if risk_score >= 75:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return risk_score, risk_level, contributes_to_gap


def calculate_invoice_cash_impact(invoice, total_expenses, contributes_to_gap):
    """
    Calculate Cash-Flow Impact Score (0-100) and Cash Impact Level (HIGH/MEDIUM/LOW).
    Considers amount proportion and cash flow gap pressure.
    """
    amount = invoice["invoice_amount"]

    # 1. Amount Factor (Weight: 60%)
    if total_expenses > 0:
        amount_ratio = amount / total_expenses
        amount_factor = min(100.0, amount_ratio * 100.0)
    else:
        amount_factor = min(100.0, (amount / 1000000.0) * 100.0)

    # 2. Gap Pressure Factor (Weight: 40%)
    gap_pressure_factor = 100.0 if contributes_to_gap else 0.0

    # Combine weighted factors
    cash_impact_score = 0.60 * amount_factor + 0.40 * gap_pressure_factor
    cash_impact_score = int(round(cash_impact_score))
    cash_impact_score = max(0, min(100, cash_impact_score))

    if cash_impact_score >= 70:
        cash_impact_level = "HIGH"
    elif cash_impact_score >= 35:
        cash_impact_level = "MEDIUM"
    else:
        cash_impact_level = "LOW"

    return cash_impact_score, cash_impact_level


def calculate_invoice_opportunity(invoice, stats, contributes_to_gap):
    """
    Calculate an Opportunity Score (0-100) for payment acceleration.
    Considers size, buyer predictability, current delay behavior, and gap resolution.
    """
    amount = invoice["invoice_amount"]
    paid_count = stats["paid_count"]

    # 1. Amount Factor (Weight: 35%)
    amount_factor = min(100.0, (amount / 500000.0) * 100.0)

    # 2. Predictability / Consistency Factor (Weight: 25%)
    if paid_count >= 3:
        std_val = stats.get("std_payment_days", 0.0)
        predictability_factor = max(0.0, 100.0 - (std_val * 3.0))
    else:
        predictability_factor = 30.0  # Safe low-moderate default

    # 3. Lateness / Room for Improvement Factor (Weight: 20%)
    if paid_count >= 3:
        avg_delay = stats.get("avg_delay", 0.0)
        lateness_factor = min(100.0, max(0.0, avg_delay * 5.0))
    else:
        lateness_factor = 30.0

    # 4. Gap Resolution Factor (Weight: 20%)
    gap_resolution_factor = 100.0 if contributes_to_gap else 0.0

    # Combine weighted factors
    opportunity_score = (
        0.35 * amount_factor +
        0.25 * predictability_factor +
        0.20 * lateness_factor +
        0.20 * gap_resolution_factor
    )

    opportunity_score = int(round(opportunity_score))
    opportunity_score = max(0, min(100, opportunity_score))

    return opportunity_score


def calculate_priority_score(risk_score, cash_impact_score, opportunity_score):
    """
    Calculate a final Priority Score (0-100) combining Risk, Cash-Flow Impact, and Opportunity.
    Formula: 40% Risk + 35% Cash Impact + 25% Opportunity.
    """
    priority = 0.40 * risk_score + 0.35 * cash_impact_score + 0.25 * opportunity_score
    priority = int(round(priority))
    return max(0, min(100, priority))


def recommend_action(invoice, risk_level, cash_impact_level, stats, today):
    """
    Determine a recommended action category and explanation.
    Action categories: MONITOR, SEND_REMINDER, REVIEW_PAYMENT_TERMS, NEGOTIATE,
                       REQUEST_EARLY_PAYMENT, REQUEST_PARTIAL_PAYMENT, ESCALATE.
    """
    payment_status = invoice["payment_status"]
    days_overdue = 0
    if payment_status == "Overdue":
        days_overdue = (today - invoice["due_date"]).days

    # 1. ESCALATE if significantly overdue (e.g., > 14 days)
    if payment_status == "Overdue" and days_overdue > 14:
        return (
            "ESCALATE",
            f"Invoice is overdue by {days_overdue} days. Contact the buyer immediately and escalate collection activities."
        )

    # 2. SEND_REMINDER if slightly overdue
    if payment_status == "Overdue":
        return (
            "SEND_REMINDER",
            f"Invoice is overdue by {days_overdue} days. Send a standard payment reminder."
        )

    # 3. MONITOR if insufficient history
    if stats["paid_count"] < 3:
        return (
            "MONITOR",
            "Insufficient payment history for this buyer. Monitor the invoice closely as the due date approaches."
        )

    # 4. NEGOTIATE if high risk and high cash impact
    if risk_level == "HIGH" and cash_impact_level == "HIGH":
        return (
            "NEGOTIATE",
            "High buyer risk combined with high financial impact. Initiate early contact to secure payment commitment."
        )

    # 5. REVIEW_PAYMENT_TERMS if high risk but lower impact
    if risk_level == "HIGH":
        return (
            "REVIEW_PAYMENT_TERMS",
            "Buyer payment behavior is historically highly delayed. Review and consider tightening future credit terms."
        )

    # 6. REQUEST_EARLY_PAYMENT if high impact and good opportunity
    if cash_impact_level == "HIGH":
        return (
            "REQUEST_EARLY_PAYMENT",
            "Invoice has a major cash-flow impact. Offer early payment incentives to secure the funds earlier."
        )

    # 7. REQUEST_PARTIAL_PAYMENT if moderately high risk
    if risk_level == "MEDIUM":
        return (
            "REQUEST_PARTIAL_PAYMENT",
            "Moderate payment delay risk. Request partial payment or installment agreement to mitigate risk."
        )

    # Default action
    return (
        "MONITOR",
        "Invoice risk is low. Monitor invoice and track payment behavior."
    )


def generate_why_explanation(invoice, stats, cash_impact_pct, contributes_to_gap, is_overdue, today):
    """
    Generate dynamic, data-driven bullet points explaining the invoice priority ranking.
    """
    reasons = []
    amount = invoice["invoice_amount"]
    reasons.append(f"Rs. {amount:,.0f} outstanding.")

    if is_overdue:
        days_overdue = (today - invoice["due_date"]).days
        reasons.append(f"Invoice is already {days_overdue} days overdue.")
    else:
        days_to_due = (invoice["due_date"] - today).days
        reasons.append(f"Contractual due date is in {days_to_due} days.")

    # Buyer history
    paid_count = stats["paid_count"]
    if paid_count >= 3:
        if stats["avg_delay"] > 0:
            reasons.append(f"Buyer historically pays {stats['avg_delay']:.0f} days late on average.")
        if stats["late_payment_rate"] > 0:
            reasons.append(f"Buyer has a {stats['late_payment_rate']:.0f}% late-payment rate.")
    else:
        reasons.append("Buyer has insufficient historical payment data.")

    # Cash flow gap contribution
    if contributes_to_gap:
        reasons.append("Predicted payment window overlaps with a projected cash-flow gap.")
        reasons.append(f"This invoice represents {cash_impact_pct:.0f}% of the required cash during the gap pressure period.")
    elif cash_impact_pct > 10:
        reasons.append(f"Invoice represents {cash_impact_pct:.0f}% of the total expected business expenses.")

    # Opportunity
    if paid_count >= 3 and stats["std_payment_days"] <= 5:
        reasons.append(
            f"Buyer payment behavior is highly predictable (std dev of {stats['std_payment_days']:.1f} days), "
            f"making payment acceleration opportunities more viable."
        )

    return reasons


def get_priority_queue(invoices, expenses=UPCOMING_EXPENSES_DEFAULT, today=DEFAULT_EVALUATION_DATE):
    """
    Integrates forecasting, risk modeling, impact scoring, opportunity scoring,
    and returns a priority queue sorted by Priority Score.
    """
    unpaid_invoices, buyer_stats = analyze_and_forecast(invoices, today)
    gaps = detect_cash_flow_gaps(unpaid_invoices, expenses, today, "base")

    total_expenses = sum(exp["amount"] for exp in expenses)

    queue = []

    for inv in unpaid_invoices:
        name = inv["buyer_name"]
        stats = buyer_stats[name]

        # Calculate scores
        risk_score, risk_level, contributes_to_gap = calculate_invoice_risk_score(inv, stats, gaps, today)
        cash_impact_score, cash_impact_level = calculate_invoice_cash_impact(inv, total_expenses, contributes_to_gap)
        opp_score = calculate_opportunity_score = calculate_invoice_opportunity(inv, stats, contributes_to_gap)
        priority_score = calculate_priority_score(risk_score, cash_impact_score, opp_score)

        # Action Recommendations
        action_cat, action_reason = recommend_action(inv, risk_level, cash_impact_level, stats, today)

        # Cash impact percentage
        if contributes_to_gap:
            # Find the specific gap this invoice contributes to
            rel_gap_amount = total_expenses
            for gap in gaps:
                if inv["due_date"] <= gap["expense_date"] and inv["predicted_payment_date"] > gap["expense_date"]:
                    rel_gap_amount = gap["gap_amount"]
                    break
            cash_impact_pct = (inv["invoice_amount"] / rel_gap_amount) * 100 if rel_gap_amount > 0 else 0.0
        else:
            cash_impact_pct = (inv["invoice_amount"] / total_expenses) * 100 if total_expenses > 0 else 0.0

        is_overdue = inv["payment_status"] == "Overdue"

        # Why explanation
        why_bullets = generate_why_explanation(inv, stats, cash_impact_pct, contributes_to_gap, is_overdue, today)

        # Queue element
        queue_item = {
            "invoice_id": inv["invoice_id"],
            "buyer_name": name,
            "invoice_amount": inv["invoice_amount"],
            "due_date": inv["due_date"],
            "predicted_payment_date": inv["predicted_payment_date"],
            "payment_status": inv["payment_status"],
            "risk_score": risk_score,
            "risk_level": risk_level,
            "cash_impact_score": cash_impact_score,
            "cash_impact_level": cash_impact_level,
            "opportunity_score": opp_score,
            "priority_score": priority_score,
            "recommended_action": action_cat,
            "action_explanation": action_reason,
            "why_explanation": why_bullets,
            "contributes_to_gap": contributes_to_gap
        }
        queue.append(queue_item)

    # Sort descending by priority score
    queue.sort(key=lambda x: x["priority_score"], reverse=True)
    return queue, gaps, buyer_stats


def main():
    """Command-line Demo for Risk & Opportunity Engine (Stage 3)."""
    csv_path = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "sample_invoices.csv"))
    if not os.path.exists(csv_path):
        print(f"Error: Sample data not found at {csv_path}")
        return

    invoices = load_invoices(csv_path)
    today = DEFAULT_EVALUATION_DATE

    queue, gaps, buyer_stats = get_priority_queue(invoices, UPCOMING_EXPENSES_DEFAULT, today)

    # Calculate statistics for the opportunity summary
    total_outstanding = sum(item["invoice_amount"] for item in queue)
    
    high_risk_queue = [item for item in queue if item["risk_level"] == "HIGH"]
    high_risk_outstanding = sum(item["invoice_amount"] for item in high_risk_queue)

    high_priority_queue = [item for item in queue if item["priority_score"] >= 70]
    high_priority_outstanding = sum(item["invoice_amount"] for item in high_priority_queue)

    # Potential early-payment opportunity (sum of invoices where opportunity score >= 60 and predicted payment delay exists)
    opp_invoices = [item for item in queue if item["opportunity_score"] >= 60]
    potential_opportunity_amount = sum(item["invoice_amount"] for item in opp_invoices)

    num_high_priority = len(high_priority_queue)
    buyers_requiring_action = len(set(item["buyer_name"] for item in queue if item["priority_score"] >= 50))
    
    # Maximum gap found
    max_gap = max([g["gap_amount"] for g in gaps]) if gaps else 0.0

    print("=" * 55)
    print(" TERM WISE RISK & OPPORTUNITY ENGINE (STAGE 3)")
    print("=" * 55)
    print("BUSINESS OVERVIEW\n")
    print(f"Total Outstanding         : Rs. {total_outstanding:,.2f}")
    print(f"High-Risk Outstanding     : Rs. {high_risk_outstanding:,.2f}")
    print(f"Potential Cash-Flow Gap   : Rs. {max_gap:,.2f}")
    print("-" * 55)

    print("\nTERM WISE OPPORTUNITY SUMMARY\n")
    print(f"  Total Outstanding                   : Rs. {total_outstanding:,.2f}")
    print(f"  High-Risk Outstanding               : Rs. {high_risk_outstanding:,.2f}")
    print(f"  High-Priority Outstanding           : Rs. {high_priority_outstanding:,.2f}")
    print(f"  Potential Early-Payment Opportunity : Rs. {potential_opportunity_amount:,.2f} (Estimated)")
    print(f"  Number of High-Priority Invoices    : {num_high_priority}")
    print(f"  Number of Buyers Requiring Action   : {buyers_requiring_action}")
    print(f"  Potential Cash-Flow Gap             : Rs. {max_gap:,.2f}")

    print("\n" + "=" * 55)
    print(" TOP PRIORITIES")
    print("=" * 55)

    for i, item in enumerate(queue, 1):
        attention_level = "LOW"
        if item["priority_score"] >= 80:
            attention_level = "URGENT"
        elif item["priority_score"] >= 50:
            attention_level = "HIGH"

        print(f"\n#{i} {item['buyer_name']}")
        print(f"  Invoice: {item['invoice_id']}")
        print(f"  Outstanding: Rs. {item['invoice_amount']:,.2f}")
        print(f"  Payment Status: {item['payment_status']}")
        print(f"  Due Date: {item['due_date'].strftime('%Y-%m-%d')}")
        print(f"  Predicted Payment: {item['predicted_payment_date'].strftime('%Y-%m-%d')}")
        print(f"  Risk Score: {item['risk_score']}/100 ({item['risk_level']})")
        print(f"  Cash Impact: {item['cash_impact_level']} ({item['cash_impact_score']}/100)")
        print(f"  Opportunity Score: {item['opportunity_score']}/100")
        print(f"  Priority Score: {item['priority_score']}/100 ({attention_level})")
        print(f"  Recommended Action: {item['recommended_action']}")
        print(f"  Action Rationale: {item['action_explanation']}")
        print("  Why?")
        for bullet in item["why_explanation"]:
            print(f"    - {bullet}")
        print("-" * 55)


if __name__ == "__main__":
    main()
