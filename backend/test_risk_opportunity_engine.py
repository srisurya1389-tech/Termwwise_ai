"""
Unit Tests for TermWise Risk & Opportunity Engine (Stage 3)
"""

import os
import sys
import unittest
from datetime import date

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from risk_opportunity_engine import (
    calculate_invoice_risk_score,
    calculate_invoice_cash_impact,
    calculate_invoice_opportunity,
    calculate_priority_score,
    recommend_action,
    generate_why_explanation,
    get_priority_queue,
    UPCOMING_EXPENSES_DEFAULT
)


class TestRiskOpportunityEngine(unittest.TestCase):

    def setUp(self):
        self.today = date(2026, 8, 31)
        self.reliable_stats = {
            "paid_count": 5,
            "avg_payment_days": 30.2,
            "median_payment_days": 30.0,
            "min_payment_days": 29,
            "max_payment_days": 32,
            "std_payment_days": 1.2,
            "avg_agreed_term": 30.0,
            "avg_delay": 0.2,
            "late_payment_rate": 0.0
        }
        self.risky_stats = {
            "paid_count": 5,
            "avg_payment_days": 73.4,
            "median_payment_days": 74.0,
            "min_payment_days": 66,
            "max_payment_days": 78,
            "std_payment_days": 4.5,
            "avg_agreed_term": 60.0,
            "avg_delay": 13.4,
            "late_payment_rate": 100.0
        }
        self.low_history_stats = {
            "paid_count": 1,
            "avg_payment_days": 29.0,
            "median_payment_days": 29.0,
            "min_payment_days": 29,
            "max_payment_days": 29,
            "std_payment_days": 0.0,
            "avg_agreed_term": 30.0,
            "avg_delay": -1.0,
            "late_payment_rate": 0.0
        }

    def test_risk_score_calculation(self):
        # 1. Reliable buyer invoice not yet due (due in 15 days)
        invoice = {
            "invoice_id": "INV-1",
            "due_date": date(2026, 9, 15),
            "invoice_amount": 100000.0,
            "payment_status": "Outstanding",
            "predicted_payment_date": date(2026, 9, 15)
        }
        gaps = []
        score, level, contributes = calculate_invoice_risk_score(invoice, self.reliable_stats, gaps, self.today)
        self.assertLess(score, 40)
        self.assertEqual(level, "LOW")
        self.assertFalse(contributes)

        # 2. Risky buyer invoice overdue
        invoice_overdue = {
            "invoice_id": "INV-2",
            "due_date": date(2026, 8, 15),  # 16 days overdue
            "invoice_amount": 100000.0,
            "payment_status": "Overdue",
            "predicted_payment_date": date(2026, 9, 10)
        }
        score, level, contributes = calculate_invoice_risk_score(invoice_overdue, self.risky_stats, gaps, self.today)
        self.assertGreaterEqual(score, 60)
        self.assertEqual(level, "MEDIUM")

    def test_cash_flow_impact_calculation(self):
        invoice = {
            "invoice_amount": 250000.0
        }
        total_expenses = 1000000.0  # Invoice represents 25% of total expenses
        
        # Scenario without gap contribution
        score, level = calculate_invoice_cash_impact(invoice, total_expenses, contributes_to_gap=False)
        # amount factor = 25% -> weighted = 15. Gap = 0. Total score = 15
        self.assertEqual(level, "LOW")

        # Scenario with gap contribution
        score_gap, level_gap = calculate_invoice_cash_impact(invoice, total_expenses, contributes_to_gap=True)
        # Gap pressure adds 40. Total = 15 + 40 = 55 -> MEDIUM
        self.assertEqual(level_gap, "MEDIUM")

    def test_opportunity_detection(self):
        invoice = {
            "invoice_amount": 500000.0
        }
        # Risky but consistent stats (avg delay is 13.4 days, std dev is small)
        opp_score = calculate_invoice_opportunity(invoice, self.risky_stats, contributes_to_gap=True)
        self.assertGreaterEqual(opp_score, 60)  # Should represent a high opportunity to negotiate early payment

    def test_priority_score_calculation(self):
        risk = 80
        impact = 70
        opp = 90
        # Priority = 0.4*80 + 0.35*70 + 0.25*90 = 32 + 24.5 + 22.5 = 79 -> rounded to 79
        self.assertEqual(calculate_priority_score(risk, impact, opp), 79)

    def test_priority_ordering(self):
        # Setup dummy outstanding invoices representing different priority profiles
        invoices = [
            {"buyer_name": "ABC Industries", "invoice_id": "INV-1001", "invoice_amount": 10000.0, "invoice_date": date(2026, 8, 1), "agreed_payment_days": 30, "due_date": date(2026, 8, 31), "payment_status": "Outstanding", "actual_payment_date": None},
            {"buyer_name": "XYZ Manufacturing", "invoice_id": "INV-1002", "invoice_amount": 500000.0, "invoice_date": date(2026, 7, 1), "agreed_payment_days": 60, "due_date": date(2026, 8, 30), "payment_status": "Overdue", "actual_payment_date": None}
        ]
        
        # Test default queue ordering
        # XYZ has a larger amount and is overdue, so it should rank higher in priority than the small ABC invoice
        queue, _, _ = get_priority_queue(invoices, UPCOMING_EXPENSES_DEFAULT, self.today)
        self.assertEqual(queue[0]["invoice_id"], "INV-1002")

    def test_action_recommendation(self):
        # 1. Extremely overdue invoice -> ESCALATE
        inv_escalate = {
            "payment_status": "Overdue",
            "due_date": date(2026, 8, 1)  # 30 days overdue
        }
        action, _ = recommend_action(inv_escalate, "HIGH", "HIGH", self.risky_stats, self.today)
        self.assertEqual(action, "ESCALATE")

        # 2. Slightly overdue invoice -> SEND_REMINDER
        inv_reminder = {
            "payment_status": "Overdue",
            "due_date": date(2026, 8, 25)  # 6 days overdue
        }
        action, _ = recommend_action(inv_reminder, "HIGH", "HIGH", self.risky_stats, self.today)
        self.assertEqual(action, "SEND_REMINDER")

        # 3. Outstanding invoice, high risk and high impact -> NEGOTIATE
        inv_negotiate = {
            "payment_status": "Outstanding",
            "due_date": date(2026, 9, 15)
        }
        action, _ = recommend_action(inv_negotiate, "HIGH", "HIGH", self.risky_stats, self.today)
        self.assertEqual(action, "NEGOTIATE")

    def test_why_explanation_generation(self):
        invoice = {
            "invoice_id": "INV-3",
            "invoice_amount": 320000.0,
            "due_date": date(2026, 9, 15),
            "payment_status": "Outstanding"
        }
        explanation = generate_why_explanation(
            invoice,
            self.risky_stats,
            cash_impact_pct=42.0,
            contributes_to_gap=True,
            is_overdue=False,
            today=self.today
        )
        # Verify explainability details are in the output
        self.assertTrue(any("Rs. 320,000 outstanding" in bullet for bullet in explanation))
        self.assertTrue(any("historically pays 13 days late" in bullet for bullet in explanation))
        self.assertTrue(any("42%" in bullet for bullet in explanation))
        self.assertTrue(any("cash-flow gap" in bullet for bullet in explanation))

    def test_edge_case_zero_amount(self):
        invoice = {
            "invoice_id": "INV-Zero",
            "due_date": date(2026, 9, 15),
            "invoice_amount": 0.0,
            "payment_status": "Outstanding",
            "predicted_payment_date": date(2026, 9, 15)
        }
        gaps = []
        score, level, contributes = calculate_invoice_risk_score(invoice, self.reliable_stats, gaps, self.today)
        impact_score, impact_level = calculate_invoice_cash_impact(invoice, total_expenses=100000.0, contributes_to_gap=False)
        
        self.assertEqual(impact_score, 0)
        self.assertEqual(impact_level, "LOW")


if __name__ == "__main__":
    unittest.main()
