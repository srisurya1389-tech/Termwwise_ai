"""
Unit Tests for TermWise AI Negotiation Agent (Stage 5)
"""

import os
import sys
import unittest
from datetime import date

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from negotiation_agent import (
    MockLLMProvider,
    get_llm_provider,
    compile_negotiation_context,
    generate_negotiation_strategy,
    generate_negotiation_message,
    analyze_buyer_response,
    NegotiationSession
)


class TestNegotiationAgent(unittest.TestCase):

    def setUp(self):
        self.today = date(2026, 8, 31)
        self.provider = MockLLMProvider()
        
        # Grounded context mock dictionary
        self.context = {
            "buyer_name": "ABC Industries",
            "invoice_id": "INV-1033",
            "invoice_amount": 350000.0,
            "current_payment_term": 90,
            "historical_median_payment": 62,
            "historical_avg_payment": 62,
            "late_payment_rate": 20,
            "avg_delay": 2,
            "target_term": 60,
            "fallback_term": 75,
            "max_acceptable_term": 90,
            "confidence": "HIGH",
            "confidence_reason": "High confidence based on sufficient history.",
            "evidence": ["Buyer median is 62 days", "SME cash requirement requires within 75 days"],
            "tradeoff": "Target 60 days is aggressive, fallback 75 days matches usual behavior."
        }

        # Negotiation State
        self.session = NegotiationSession(
            invoice_id="INV-1033",
            target=60,
            fallback=75,
            boundary=90
        )

    def test_mock_provider_fallback(self):
        # Override environment variables temporarily to force mock mode
        os.environ["MOCK_LLM"] = "true"
        if "LLM_API_KEY" in os.environ:
            del os.environ["LLM_API_KEY"]

        provider = get_llm_provider()
        self.assertIsInstance(provider, MockLLMProvider)

    def test_negotiation_strategy_generation(self):
        strategy = generate_negotiation_strategy(self.provider, self.context)
        self.assertIn("[MOCK MODE] STRATEGY:", strategy)
        self.assertIn("60 days", strategy)
        self.assertIn("75 days", strategy)
        self.assertIn("90 days", strategy)

    def test_negotiation_message_generation_fact_grounding(self):
        message = generate_negotiation_message(self.provider, self.context)
        self.assertIn("[MOCK MODE] MESSAGE:", message)
        self.assertIn("INV-1033", message)
        self.assertIn("60 days", message)
        # Ensure it does NOT leak internal maximum acceptable term or risk boundaries
        self.assertNotIn("90 days", message)
        self.assertNotIn("boundary", message.lower())

    def test_session_approval_status(self):
        message = "Proposed term of 60 days Discussion"
        self.session.add_history_entry("SME", message, action="SEND_PROPOSAL", approval_status="PENDING")
        self.assertEqual(len(self.session.state["history"]), 1)
        self.assertEqual(self.session.state["history"][0]["approval_status"], "PENDING")

    def test_buyer_accepts_target(self):
        buyer_msg = "We agree to the 60 days payment term."
        analysis = analyze_buyer_response(self.provider, self.session.state, buyer_msg)
        
        self.assertEqual(analysis["category"], "ACCEPTED")
        self.assertEqual(analysis["detected_term_days"], 60)
        self.assertEqual(analysis["negotiation_status"], "AGREED")
        self.assertEqual(analysis["recommended_action"], "ACCEPT")
        self.assertEqual(analysis["action_details"]["risk"], "LOW")

    def test_buyer_proposes_fallback(self):
        buyer_msg = "We can offer 75 days payment terms."
        analysis = analyze_buyer_response(self.provider, self.session.state, buyer_msg)
        
        self.assertEqual(analysis["category"], "COUNTEROFFER")
        self.assertEqual(analysis["detected_term_days"], 75)
        self.assertEqual(analysis["negotiation_status"], "ACCEPTABLE_WITH_TRADEOFF")
        self.assertEqual(analysis["recommended_action"], "ACCEPT")

    def test_buyer_proposes_boundary(self):
        buyer_msg = "The best we can do is 90 days."
        analysis = analyze_buyer_response(self.provider, self.session.state, buyer_msg)
        
        self.assertEqual(analysis["category"], "COUNTEROFFER")
        self.assertEqual(analysis["detected_term_days"], 90)
        self.assertEqual(analysis["negotiation_status"], "COUNTER_OR_CONSIDER")
        self.assertEqual(analysis["recommended_action"], "REQUEST_PARTIAL_ADVANCE")

    def test_buyer_exceeds_boundary(self):
        buyer_msg = "We can only pay at 120 days."
        analysis = analyze_buyer_response(self.provider, self.session.state, buyer_msg)
        
        self.assertEqual(analysis["category"], "COUNTEROFFER")
        self.assertEqual(analysis["detected_term_days"], 120)
        self.assertEqual(analysis["negotiation_status"], "BOUNDARY_EXCEEDED")
        self.assertEqual(analysis["recommended_action"], "ESCALATE_TO_HUMAN")
        self.assertEqual(analysis["action_details"]["risk"], "HIGH")

    def test_buyer_unclear_response(self):
        buyer_msg = "Let me check with our finance director and get back to you next week."
        analysis = analyze_buyer_response(self.provider, self.session.state, buyer_msg)
        
        self.assertEqual(analysis["category"], "UNCLEAR")
        self.assertIsNone(analysis["detected_term_days"])
        self.assertEqual(analysis["recommended_action"], "FOLLOW_UP")


if __name__ == "__main__":
    unittest.main()
