"""
Unit Tests for TermWise Cash-Flow Forecast Engine (Stage 2)
"""

import os
import sys
import unittest
from datetime import date, timedelta

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from cash_flow_forecast import (
    calculate_buyer_stats,
    predict_payment_window,
    predict_invoice_dates,
    forecast_cash_inflow_by_scenario,
    detect_cash_flow_gaps,
    analyze_and_forecast
)


class TestCashFlowForecastEngine(unittest.TestCase):

    def setUp(self):
        # Set up standard buyer stats for testing
        self.sufficient_stats = {
            "paid_count": 5,
            "avg_payment_days": 62.4,
            "median_payment_days": 62.0,
            "min_payment_days": 59,
            "max_payment_days": 66,
            "std_payment_days": 2.5,
            "avg_agreed_term": 60.0,
            "avg_delay": 2.4,
            "late_payment_rate": 20.0
        }
        
        self.insufficient_stats = {
            "paid_count": 1,
            "avg_payment_days": 30.0,
            "median_payment_days": 30.0,
            "min_payment_days": 30,
            "max_payment_days": 30,
            "std_payment_days": 0.0,
            "avg_agreed_term": 30.0,
            "avg_delay": 0.0,
            "late_payment_rate": 0.0
        }

    def test_buyer_stats_calculation(self):
        # Setup synthetic invoices for a buyer
        invoices = [
            {"payment_status": "Paid", "invoice_date": date(2026, 1, 1), "due_date": date(2026, 1, 31), "actual_payment_date": date(2026, 2, 2), "agreed_payment_days": 30}, # 32 days
            {"payment_status": "Paid", "invoice_date": date(2026, 2, 1), "due_date": date(2026, 3, 3), "actual_payment_date": date(2026, 3, 1), "agreed_payment_days": 30}, # 28 days
            {"payment_status": "Paid", "invoice_date": date(2026, 3, 1), "due_date": date(2026, 3, 31), "actual_payment_date": date(2026, 3, 31), "agreed_payment_days": 30}, # 30 days
        ]
        stats = calculate_buyer_stats(invoices)
        self.assertEqual(stats["paid_count"], 3)
        self.assertEqual(stats["min_payment_days"], 28)
        self.assertEqual(stats["max_payment_days"], 32)
        self.assertEqual(stats["median_payment_days"], 30.0)
        self.assertEqual(stats["avg_payment_days"], 30.0)
        # Delay: 2 days, -2 days, 0 days -> average delay = 0 days
        self.assertEqual(stats["avg_delay"], 0.0)
        # None of them > due date + 5 days grace period
        self.assertEqual(stats["late_payment_rate"], 0.0)

    def test_payment_window_sufficient_history(self):
        # Test sufficient history (>= 5 is HIGH, 3-4 is MEDIUM)
        window_high = predict_payment_window(self.sufficient_stats, agreed_term=60)
        self.assertEqual(window_high["confidence_level"], "HIGH")
        self.assertEqual(window_high["predicted_payment_days"], 62)
        self.assertEqual(window_high["earliest_expected_days"], 59)
        self.assertEqual(window_high["latest_expected_days"], 66)
        self.assertIn("based on 5 historical payments", window_high["explanation"])

        # Test medium confidence (e.g. 4 paid invoices)
        medium_stats = self.sufficient_stats.copy()
        medium_stats["paid_count"] = 4
        window_med = predict_payment_window(medium_stats, agreed_term=60)
        self.assertEqual(window_med["confidence_level"], "MEDIUM")
        self.assertEqual(window_med["predicted_payment_days"], 62)

    def test_payment_window_low_confidence(self):
        # Test low confidence for insufficient history (< 3 paid invoices)
        window_low = predict_payment_window(self.insufficient_stats, agreed_term=45)
        self.assertEqual(window_low["confidence_level"], "LOW")
        # Defaults to agreed term
        self.assertEqual(window_low["predicted_payment_days"], 45)
        self.assertEqual(window_low["earliest_expected_days"], 45)
        self.assertEqual(window_low["latest_expected_days"], 75)  # 45 + 30 days buffer
        self.assertEqual(window_low["explanation"], "Insufficient historical payment data.")

    def test_predict_invoice_dates(self):
        invoice_date = date(2026, 8, 1)
        window = {
            "predicted_payment_days": 62,
            "earliest_expected_days": 59,
            "latest_expected_days": 66
        }
        dates = predict_invoice_dates(invoice_date, window)
        self.assertEqual(dates["predicted_payment_date"], date(2026, 10, 2))
        self.assertEqual(dates["earliest_expected_payment_date"], date(2026, 9, 29))
        self.assertEqual(dates["latest_expected_payment_date"], date(2026, 10, 6))

    def test_cash_inflow_buckets(self):
        today = date(2026, 8, 31)
        unpaid = [
            {
                "invoice_amount": 100000.0,
                "predicted_payment_date": today + timedelta(days=5),
                "earliest_expected_payment_date": today + timedelta(days=2),
                "latest_expected_payment_date": today + timedelta(days=10)
            },
            {
                "invoice_amount": 200000.0,
                "predicted_payment_date": today + timedelta(days=20),
                "earliest_expected_payment_date": today + timedelta(days=14),
                "latest_expected_payment_date": today + timedelta(days=25)
            },
            {
                "invoice_amount": 300000.0,
                "predicted_payment_date": today + timedelta(days=45),
                "earliest_expected_payment_date": today + timedelta(days=35),
                "latest_expected_payment_date": today + timedelta(days=55)
            }
        ]
        
        # Test base scenario
        base = forecast_cash_inflow_by_scenario(unpaid, today, "base")
        self.assertEqual(base["within_7"], 100000.0)
        self.assertEqual(base["within_15"], 100000.0)
        self.assertEqual(base["within_30"], 300000.0)  # 100k + 200k
        self.assertEqual(base["within_60"], 600000.0)  # 100k + 200k + 300k

        # Test optimistic scenario
        opt = forecast_cash_inflow_by_scenario(unpaid, today, "optimistic")
        self.assertEqual(opt["within_7"], 100000.0)
        self.assertEqual(opt["within_15"], 300000.0)   # 100k + 200k expected in 14 days
        self.assertEqual(opt["within_30"], 300000.0)
        self.assertEqual(opt["within_60"], 600000.0)

        # Test pessimistic scenario
        pess = forecast_cash_inflow_by_scenario(unpaid, today, "pessimistic")
        self.assertEqual(pess["within_7"], 0.0)         # first invoice expected in 10 days
        self.assertEqual(pess["within_15"], 100000.0)
        self.assertEqual(pess["within_30"], 300000.0)   # second invoice in 25 days
        self.assertEqual(pess["within_60"], 600000.0)

    def test_cash_flow_gap_detection(self):
        today = date(2026, 8, 31)
        unpaid = [
            {
                "buyer_name": "ABC Industries",
                "invoice_amount": 300000.0,
                "due_date": date(2026, 8, 25),
                "predicted_payment_date": date(2026, 9, 12),
                "earliest_expected_payment_date": date(2026, 9, 10),
                "latest_expected_payment_date": date(2026, 9, 15)
            }
        ]
        expenses = [
            {
                "name": "Supplier Payments",
                "amount": 500000.0,
                "expected_date": "2026-09-10"
            }
        ]
        
        # Test base scenario gap
        gaps = detect_cash_flow_gaps(unpaid, expenses, today, "base")
        self.assertEqual(len(gaps), 1)
        self.assertEqual(gaps[0]["gap_amount"], 500000.0) # Inflow is 0 by Sept 10 under base (since it arrives Sept 12)
        self.assertEqual(gaps[0]["expense_date"], date(2026, 9, 10))
        self.assertIn("ABC Industries may arrive later than required", gaps[0]["reason"])

        # Test optimistic scenario (arrives exactly Sept 10, so inflow of 300k, gap is 200k)
        gaps_opt = detect_cash_flow_gaps(unpaid, expenses, today, "optimistic")
        self.assertEqual(len(gaps_opt), 1)
        self.assertEqual(gaps_opt[0]["gap_amount"], 200000.0)


if __name__ == "__main__":
    unittest.main()
