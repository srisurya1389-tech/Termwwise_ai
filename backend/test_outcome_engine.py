"""
Unit Tests for TermWise Outcome & Learning Engine (Stage 6)
"""

import os
import sys
import unittest
from datetime import date

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from outcome_engine import (
    calculate_outcome,
    calculate_outcome_score,
    calculate_prediction_accuracy,
    get_system_performance,
    get_buyer_learning_profile,
    get_updated_invoices
)


class TestOutcomeEngine(unittest.TestCase):

    def setUp(self):
        # Sample base invoices structure
        self.csv_invoices = [
            {"buyer_name": "ABC Industries", "invoice_id": "INV-1", "invoice_amount": 100000.0, "agreed_payment_days": 90, "payment_status": "Paid", "invoice_date": date(2026, 1, 1), "actual_payment_date": date(2026, 3, 2)}, # 60 days
            {"buyer_name": "ABC Industries", "invoice_id": "INV-2", "invoice_amount": 100000.0, "agreed_payment_days": 90, "payment_status": "Paid", "invoice_date": date(2026, 1, 15), "actual_payment_date": date(2026, 3, 26)}, # 70 days
            {"buyer_name": "ABC Industries", "invoice_id": "INV-3", "invoice_amount": 150000.0, "agreed_payment_days": 90, "payment_status": "Outstanding", "invoice_date": date(2026, 8, 15)}
        ]

        # Outcomes list (with synthetic demo data)
        self.outcomes = [
            {
                "buyer_name": "ABC Industries",
                "invoice_id": "INV-3",  # Matches the CSV outstanding invoice
                "original_invoice_amount": 150000.0,
                "original_payment_term": 90,
                "recommended_target_term": 60,
                "recommended_fallback_term": 60,
                "recommended_boundary": 75,
                "negotiation_start_date": "2026-08-15",
                "final_agreed_term": 60,
                "negotiation_status": "AGREED",
                "agreement_date": "2026-08-16",
                "actual_payment_date": "2026-10-14",
                "actual_payment_days": 60,
                "original_predicted_payment_days": 65,
                "original_predicted_payment_window": "60-70",
                "cash_flow_gap_before": 500000.0,
                "cash_flow_gap_after": 200000.0,
                "payment_amount": 150000.0,
                "outcome": "PAID_AS_EXPECTED",
                "human_approved": True,
                "notes": "Negotiation succeeded"
            },
            {
                "buyer_name": "XYZ Manufacturing",
                "invoice_id": "INV-XYZ-1",
                "original_invoice_amount": 200000.0,
                "original_payment_term": 60,
                "recommended_target_term": 45,
                "recommended_fallback_term": 60,
                "recommended_boundary": 75,
                "negotiation_start_date": "2026-08-01",
                "final_agreed_term": None,
                "negotiation_status": "REJECTED",
                "agreement_date": None,
                "actual_payment_date": None,
                "actual_payment_days": None,
                "original_predicted_payment_days": 70,
                "original_predicted_payment_window": "65-75",
                "cash_flow_gap_before": 100000.0,
                "cash_flow_gap_after": 100000.0,
                "payment_amount": 0.0,
                "outcome": "NEGOTIATION_FAILED",
                "human_approved": True,
                "notes": "Rejected"
            }
        ]

    def test_calculate_outcome_successful(self):
        rec = self.outcomes[0]
        res = calculate_outcome(rec)
        
        self.assertEqual(res["days_improved"], 30)
        self.assertEqual(res["prediction_error"], -5)  # 60 - 65 = -5
        self.assertEqual(res["cash_flow_gap_improvement"], 300000.0)
        
        # Test TermWise Outcome Score calculation
        # AGREED -> 30
        # Improvement 30 days -> 30
        # Timing (60 <= 65) -> 20
        # Gap reduction (500k -> 200k) -> 20
        # Total = 100
        self.assertEqual(res["termwise_outcome_score"], 100)

    def test_calculate_outcome_failed(self):
        rec = self.outcomes[1]
        res = calculate_outcome(rec)
        
        self.assertEqual(res["days_improved"], 0)
        self.assertIsNone(res["prediction_error"])
        self.assertEqual(res["cash_flow_gap_improvement"], 0.0)
        
        # Score calculation:
        # REJECTED -> 0
        # Term Improvement -> 0
        # Timing (None actual) -> 0
        # Gap (no reduction 100k -> 100k) -> 0
        # Total = 0
        self.assertEqual(res["termwise_outcome_score"], 0)

    def test_payment_timing_late(self):
        # Case where actual payment is later than predicted
        rec = self.outcomes[0].copy()
        rec["actual_payment_days"] = 72  # 7 days later than predicted 65
        
        score, reasons = calculate_outcome_score(rec)
        # Timing points = 20 - 7 = 13
        # Total = 30 (AGREED) + 30 (Term) + 13 (Timing) + 20 (Gap) = 93
        self.assertEqual(score, 93)

    def test_payment_timing_no_payment(self):
        rec = self.outcomes[0].copy()
        rec["actual_payment_days"] = None
        
        score, reasons = calculate_outcome_score(rec)
        # Timing points = 0
        # Total = 30 + 30 + 0 + 20 = 80
        self.assertEqual(score, 80)

    def test_prediction_accuracy_calculation(self):
        accuracy = calculate_prediction_accuracy(self.outcomes)
        
        self.assertEqual(accuracy["total_observations"], 1)
        self.assertEqual(accuracy["mean_absolute_error_days"], 5.0)
        self.assertEqual(accuracy["pct_within_7_days"], 100.0)

    def test_prediction_accuracy_insufficient_data(self):
        accuracy = calculate_prediction_accuracy([self.outcomes[1]])  # Rejected outcome has no payment timing
        self.assertEqual(accuracy, "Insufficient prediction history.")

    def test_system_performance(self):
        # Update invoices in-memory manually for test
        # LoadCSV has 3 items, Outcomes adds XYZ Manufacturing (new buyer) -> unique ids: INV-1, INV-2, INV-3, INV-XYZ-1 (4 total)
        perf = get_system_performance(self.csv_invoices, self.outcomes)
        
        self.assertEqual(perf["total_invoices_analyzed"], 4)
        self.assertEqual(perf["total_negotiations"], 2)
        self.assertEqual(perf["successful_negotiations"], 1)
        self.assertEqual(perf["failed_negotiations"], 1)
        self.assertEqual(perf["total_payments_observed"], 1)
        self.assertEqual(perf["average_payment_term_improvement"], 30.0)
        self.assertEqual(perf["total_amount_affected"], 350000.0)
        self.assertEqual(perf["total_cash_flow_gap_improvement"], 300000.0)

    def test_buyer_profile_updating(self):
        # Recalculate stats dynamically
        # ABC Industries has:
        # Base CSV:
        #   INV-1: Paid, actual days = 60
        #   INV-2: Paid, actual days = 70
        #   INV-3: Outstanding (not counted in CSV paid stats)
        # Outcomes:
        #   INV-3: Now AGREED and Paid, actual days = 60
        # So dynamic profile should see 3 paid payments: [60, 60, 70]
        # Average: 63.3 days, Median: 60 days
        
        # Merge invoices list
        outcome_map = {o["invoice_id"]: o for o in self.outcomes}
        merged_invoices = []
        for inv in self.csv_invoices:
            inv_id = inv["invoice_id"]
            if inv_id in outcome_map:
                out = outcome_map[inv_id]
                updated_inv = inv.copy()
                updated_inv["payment_status"] = "Paid"
                updated_inv["agreed_payment_days"] = out["final_agreed_term"]
                # Start date 2026-08-15 + 60 days = 2026-10-14 actual payment date
                updated_inv["invoice_date"] = date(2026, 8, 15)
                updated_inv["actual_payment_date"] = date(2026, 10, 14)
                merged_invoices.append(updated_inv)
            else:
                merged_invoices.append(inv)
                
        profile = get_buyer_learning_profile("ABC Industries", merged_invoices, self.outcomes)
        
        self.assertEqual(profile["total_invoices_analyzed"], 3)
        self.assertAlmostEqual(profile["average_payment_days"], 63.33333333)
        self.assertEqual(profile["median_payment_days"], 60.0)
        self.assertEqual(profile["total_negotiations"], 1)
        self.assertEqual(profile["successful_negotiations"], 1)
        self.assertEqual(profile["average_negotiated_improvement"], 30.0)
        self.assertEqual(profile["current_confidence"], "LOW")  # paid count is 3 (< 8)


if __name__ == "__main__":
    unittest.main()
