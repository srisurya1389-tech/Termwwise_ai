"""
API Integration and Routing Tests for TermWise API (Stage 7)
"""

import os
import sys
import unittest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from backend.main import app
from backend.database.connection import get_db, Base
from backend.models.buyer import Buyer
from backend.models.invoice import Invoice
from backend.models.negotiation import Negotiation

# Setup isolated in-memory test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestTermWiseAPI(unittest.TestCase):

    def setUp(self):
        # Create all tables in the temporary in-memory database
        Base.metadata.create_all(bind=engine)
        
        # Populate test data
        db = TestingSessionLocal()
        self.buyer = Buyer(name="Test Buyer")
        db.add(self.buyer)
        db.commit()
        db.refresh(self.buyer)
        self.buyer_id = self.buyer.id
        
        self.invoice = Invoice(
            invoice_id="INV-TEST-1",
            buyer_id=self.buyer_id,
            amount=250000.0,
            invoice_date=date(2026, 8, 1),
            agreed_payment_days=60,
            due_date=date(2026, 9, 30),
            payment_status="Outstanding"
        )
        db.add(self.invoice)
        db.commit()
        db.refresh(self.invoice)
        self.invoice_id = self.invoice.invoice_id
        db.close()

    def tearDown(self):
        # Drop all tables after each test run
        Base.metadata.drop_all(bind=engine)

    def test_health_check(self):
        resp = client.get("/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "healthy")

    def test_list_invoices(self):
        resp = client.get("/api/invoices")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["invoice_id"], "INV-TEST-1")

    def test_get_invoice_detail(self):
        resp = client.get("/api/invoices/INV-TEST-1")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["amount"], 250000.0)

    def test_get_invoice_not_found(self):
        resp = client.get("/api/invoices/INV-MISSING")
        self.assertEqual(resp.status_code, 404)

    def test_create_invoice_success(self):
        payload = {
            "invoice_id": "INV-NEW-99",
            "buyer_name": "Test Buyer",
            "amount": 500000.0,
            "invoice_date": "2026-08-20",
            "agreed_payment_days": 30,
            "due_date": "2026-09-19"
        }
        resp = client.post("/api/invoices", json=payload)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["invoice_id"], "INV-NEW-99")

    def test_create_invoice_validation_negative_amount(self):
        payload = {
            "invoice_id": "INV-FAIL",
            "buyer_name": "Test Buyer",
            "amount": -100.0,  # Invalid negative amount
            "invoice_date": "2026-08-20",
            "agreed_payment_days": 30,
            "due_date": "2026-09-19"
        }
        resp = client.post("/api/invoices", json=payload)
        self.assertEqual(resp.status_code, 422)  # Pydantic validation error

    def test_list_buyers(self):
        resp = client.get("/api/buyers")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)
        self.assertEqual(resp.json()[0]["name"], "Test Buyer")

    def test_get_buyer_detail_intelligence(self):
        resp = client.get("/api/buyers/1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("intelligence", data)
        self.assertEqual(data["intelligence"]["risk_level"], "MEDIUM")

    def test_forecast_endpoint(self):
        resp = client.get("/api/forecast")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total_outstanding"], 250000.0)

    def test_priorities_endpoint(self):
        resp = client.get("/api/priorities")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("queue", resp.json())
        self.assertIn("summary", resp.json())

    def test_term_analysis_endpoint(self):
        resp = client.get("/api/invoices/INV-TEST-1/term-analysis")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["invoice_id"], "INV-TEST-1")
        self.assertIn("recommended_target_term_days", resp.json())

    def test_negotiation_initiation(self):
        resp = client.post("/api/negotiations", json={"invoice_id": "INV-TEST-1"})
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["invoice_id"], "INV-TEST-1")
        self.assertEqual(data["approval_status"], "PENDING")

    def test_buyer_response_analysis(self):
        # Initiate a mock negotiation record in test DB
        db = TestingSessionLocal()
        neg = Negotiation(
            invoice_id="INV-TEST-1",
            buyer_id=self.buyer_id,
            target_term=30,
            fallback_term=45,
            boundary_term=60,
            strategy="Mock strategy",
            message="Mock message",
            status="INITIAL"
        )
        db.add(neg)
        db.commit()
        db.close()

        resp = client.post("/api/negotiations/1/response", json={"buyer_message": "We can offer 45 days"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["category"], "COUNTEROFFER")
        self.assertEqual(data["detected_term_days"], 45)
        self.assertEqual(data["negotiation_status"], "ACCEPTABLE_WITH_TRADEOFF")

    def test_human_approval(self):
        db = TestingSessionLocal()
        neg = Negotiation(
            invoice_id="INV-TEST-1",
            buyer_id=self.buyer_id,
            target_term=30,
            fallback_term=45,
            boundary_term=60,
            strategy="Mock strategy",
            message="Mock message",
            status="INITIAL",
            approval_status="PENDING"
        )
        db.add(neg)
        db.commit()
        db.close()

        resp = client.post("/api/negotiations/1/approve")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["approval_status"], "APPROVED")

    def test_record_outcome_validation_ongoing_negotiation(self):
        db = TestingSessionLocal()
        neg = Negotiation(
            invoice_id="INV-TEST-1",
            buyer_id=self.buyer_id,
            target_term=30,
            fallback_term=45,
            boundary_term=60,
            strategy="Mock strategy",
            message="Mock message",
            status="INITIAL", # Not complete
            approval_status="PENDING"
        )
        db.add(neg)
        db.commit()
        db.close()

        payload = {
            "negotiation_id": 1,
            "final_agreed_term": 45,
            "actual_payment_days": 40
        }
        resp = client.post("/api/outcomes", json=payload)
        # Should raise 400 since negotiation is not complete
        self.assertEqual(resp.status_code, 400)

    def test_dashboard_summary(self):
        resp = client.get("/api/dashboard/summary")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total_outstanding"], 250000.0)


if __name__ == "__main__":
    unittest.main()
