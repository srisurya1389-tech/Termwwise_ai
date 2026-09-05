"""
Unit Tests for TermWise Payment-Term Optimizer (Stage 4)
"""

import os
import sys
import unittest
from datetime import date

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from payment_term_optimizer import (
    percentile,
    calculate_optimizer_metrics,
    optimize_payment_terms,
    simulate_payment_term
)


class TestPaymentTermOptimizer(unittest.TestCase):

    def setUp(self):
        self.today = date(2026, 8, 31)
        
        # Synthetic buyer invoice history
        # 1. ABC Industries (5 paid invoices: actual days = [62, 59, 66, 63, 62])
        # 2. Skyline Textiles (5 paid: actual days = [29, 30, 32, 31, 29])
        # 3. Low History Co (1 paid: 29 days)
        self.invoices = [
            {"buyer_name": "ABC Industries", "invoice_id": "INV-1", "invoice_amount": 10000.0, "invoice_date": date(2026, 1, 1), "agreed_payment_days": 60, "due_date": date(2026, 3, 2), "actual_payment_date": date(2026, 3, 4), "payment_status": "Paid"}, # 62 days
            {"buyer_name": "ABC Industries", "invoice_id": "INV-2", "invoice_amount": 10000.0, "invoice_date": date(2026, 1, 15), "agreed_payment_days": 60, "due_date": date(2026, 3, 16), "actual_payment_date": date(2026, 3, 16), "payment_status": "Paid"}, # 60 days (actually 60 days, but let's use original stats list: 62, 59, 66, 63, 62)
            {"buyer_name": "ABC Industries", "invoice_id": "INV-3", "invoice_amount": 10000.0, "invoice_date": date(2026, 2, 1), "agreed_payment_days": 60, "due_date": date(2026, 4, 2), "actual_payment_date": date(2026, 4, 1), "payment_status": "Paid"}, # 59 days
            {"buyer_name": "ABC Industries", "invoice_id": "INV-4", "invoice_amount": 10000.0, "invoice_date": date(2026, 3, 1), "agreed_payment_days": 60, "due_date": date(2026, 4, 30), "actual_payment_date": date(2026, 5, 6), "payment_status": "Paid"}, # 66 days
            {"buyer_name": "ABC Industries", "invoice_id": "INV-5", "invoice_amount": 10000.0, "invoice_date": date(2026, 4, 1), "agreed_payment_days": 60, "due_date": date(2026, 5, 31), "actual_payment_date": date(2026, 6, 3), "payment_status": "Paid"}, # 63 days
            {"buyer_name": "ABC Industries", "invoice_id": "INV-6", "invoice_amount": 10000.0, "invoice_date": date(2026, 5, 1), "agreed_payment_days": 60, "due_date": date(2026, 6, 30), "actual_payment_date": date(2026, 7, 2), "payment_status": "Paid"}, # 62 days
            
            # Low history
            {"buyer_name": "Low History Co", "invoice_id": "INV-L1", "invoice_amount": 10000.0, "invoice_date": date(2026, 8, 1), "agreed_payment_days": 30, "due_date": date(2026, 8, 31), "actual_payment_date": date(2026, 8, 30), "payment_status": "Paid"} # 29 days
        ]

        self.expenses_no_gap = [
            {"name": "Office Rent", "amount": 50000.0, "expected_date": "2026-09-05"}
        ]
        
        self.expenses_with_gap = [
            {"name": "Supplier Payments", "amount": 800000.0, "expected_date": "2026-09-05"}
        ]

    def test_percentile_calculation(self):
        lst = [10, 20, 30, 40, 50]
        self.assertEqual(percentile(lst, 0.0), 10)
        self.assertEqual(percentile(lst, 1.0), 50)
        self.assertEqual(percentile(lst, 0.5), 30)
        # 25th percentile of [10, 20, 30, 40, 50] is 20
        self.assertEqual(percentile(lst, 0.25), 20)
        # 75th percentile is 40
        self.assertEqual(percentile(lst, 0.75), 40)

    def test_calculate_optimizer_metrics(self):
        metrics = calculate_optimizer_metrics("ABC Industries", self.invoices)
        self.assertEqual(metrics["paid_count"], 6)
        self.assertEqual(metrics["min_days"], 59)
        self.assertEqual(metrics["max_days"], 66)
        # actual days sorted: [59, 60, 62, 62, 63, 66]
        self.assertAlmostEqual(metrics["p25"], 60.5)
        self.assertAlmostEqual(metrics["p75"], 62.75)

    def test_optimize_payment_terms_no_gap(self):
        invoice = {
            "buyer_name": "ABC Industries",
            "invoice_id": "INV-ABC-1",
            "invoice_amount": 100000.0,
            "agreed_payment_days": 60,
            "invoice_date": date(2026, 8, 15)
        }
        res = optimize_payment_terms(invoice, self.invoices, self.expenses_no_gap, self.today)
        
        self.assertEqual(res["confidence"], "LOW")  # paid count is 5 (which is < 8)
        self.assertIn("insufficient buyer payment history", res["confidence_reason"])
        
        # Terms checking
        self.assertLessEqual(res["target_term_days"], res["fallback_term_days"])
        self.assertLessEqual(res["fallback_term_days"], res["maximum_acceptable_term_days"])

        # Check that target term does not exceed current contract term
        self.assertLessEqual(res["target_term_days"], 60)

    def test_optimize_payment_terms_with_gap(self):
        # A large invoice contributing to a severe cash-flow gap
        invoice = {
            "buyer_name": "ABC Industries",
            "invoice_id": "INV-ABC-2",
            "invoice_amount": 500000.0,
            "agreed_payment_days": 60,
            "invoice_date": date(2026, 8, 15),
            "due_date": date(2026, 10, 14),
            "payment_status": "Outstanding"
        }
        
        # Adding outstanding invoice to the dataset to trigger gap detection
        invoices_with_outstanding = self.invoices + [invoice]
        
        res = optimize_payment_terms(invoice, invoices_with_outstanding, self.expenses_with_gap, self.today)
        
        # Verify the target and max acceptable terms react to the gap
        # Tolerable days for an expense on 2026-09-05 is (2026-09-05 - 2026-08-15) = 21 days
        # The target term should be pulled forward because of the gap, but clamped to at least 15 days
        self.assertLessEqual(res["target_term_days"], 21)
        self.assertEqual(res["target_term_days"], 21)
        self.assertEqual(res["maximum_acceptable_term_days"], 60)

    def test_insufficient_history(self):
        invoice = {
            "buyer_name": "Low History Co",
            "invoice_id": "INV-L2",
            "invoice_amount": 50000.0,
            "agreed_payment_days": 30,
            "invoice_date": date(2026, 8, 15)
        }
        res = optimize_payment_terms(invoice, self.invoices, self.expenses_no_gap, self.today)
        self.assertEqual(res["confidence"], "LOW")
        # Defaults to contract term
        self.assertEqual(res["target_term_days"], 30)
        self.assertEqual(res["fallback_term_days"], 30)
        self.assertEqual(res["maximum_acceptable_term_days"], 45)  # 30 + 15

    def test_scenario_simulation(self):
        invoice = {
            "buyer_name": "ABC Industries",
            "invoice_id": "INV-ABC-Sim",
            "invoice_amount": 500000.0,
            "agreed_payment_days": 60,
            "invoice_date": date(2026, 8, 15),
            "due_date": date(2026, 10, 14),
            "payment_status": "Outstanding"
        }
        invoices_with_sim = self.invoices + [invoice]
        
        # Test simulating a short term (30 days) vs a long term (90 days)
        sim_30 = simulate_payment_term("INV-ABC-Sim", 30, invoices_with_sim, self.expenses_with_gap, self.today)
        sim_90 = simulate_payment_term("INV-ABC-Sim", 90, invoices_with_sim, self.expenses_with_gap, self.today)
        
        self.assertIsNotNone(sim_30)
        self.assertIsNotNone(sim_90)
        
        # Simulating different terms should result in different risk scores due to proximity
        self.assertNotEqual(sim_90["risk_score"], sim_30["risk_score"])
        
        # Simulating 90 days should result in a higher or equal gap than 30 days
        self.assertGreaterEqual(sim_90["max_cash_flow_gap"], sim_30["max_cash_flow_gap"])


if __name__ == "__main__":
    unittest.main()
