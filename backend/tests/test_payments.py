import os
import unittest
import hmac
import hashlib
import json
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.models.base import Base
from backend.models.buyer import Buyer
from backend.models.invoice import Invoice
from backend.models.payment import Payment, PaymentAuditLog
from backend.database.connection import get_db
from backend.main import app
from backend.services.razorpay_service import RazorpayService, razorpay_service
from backend.services.payment_reconciliation import reconcile_invoice, reconcile_all_invoices
from backend.services.payment_service import (
    record_payment,
    import_payments,
    get_invoice_payments,
    get_buyer_payment_analysis,
    get_recent_payments
)


class TestPaymentLayer(unittest.TestCase):

    def setUp(self):
        # Create an in-memory SQLite database for isolated testing
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        self.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        
        self.db = self.TestingSessionLocal()
        
        # Override dependency
        def override_get_db():
            try:
                yield self.db
            finally:
                pass
                
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Seed test Buyer & Invoices
        self.buyer = Buyer(name="Test Buyer Alpha")
        self.db.add(self.buyer)
        self.db.commit()
        self.db.refresh(self.buyer)

        self.invoice1 = Invoice(
            invoice_id="INV-TEST-001",
            buyer_id=self.buyer.id,
            amount=100000.0,
            invoice_date=date(2026, 7, 1),
            agreed_payment_days=30,
            due_date=date(2026, 7, 31),
            payment_status="Outstanding"
        )
        self.invoice2 = Invoice(
            invoice_id="INV-TEST-002",
            buyer_id=self.buyer.id,
            amount=320000.0,
            invoice_date=date(2026, 7, 1),
            agreed_payment_days=30,
            due_date=date(2026, 7, 31),
            payment_status="Outstanding"
        )
        self.db.add_all([self.invoice1, self.invoice2])
        self.db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    # 1. Razorpay configuration detection
    def test_01_razorpay_configuration(self):
        service = RazorpayService()
        # When environment variables are empty or placeholder
        os.environ["RAZORPAY_KEY_ID"] = "rzp_test_your_key_id_here"
        os.environ["RAZORPAY_KEY_SECRET"] = "your_razorpay_secret_here"
        self.assertFalse(service.is_configured())

    # 2. Demo mode detection
    def test_02_demo_mode(self):
        os.environ["RAZORPAY_KEY_ID"] = ""
        os.environ["RAZORPAY_KEY_SECRET"] = ""
        status = razorpay_service.get_status()
        self.assertFalse(status["configured"])
        self.assertEqual(status["mode"], "DEMO")
        self.assertIn("Demo Mode", status["message"])

    # 3. Live configuration detection
    def test_03_live_configuration_detection(self):
        os.environ["RAZORPAY_KEY_ID"] = "rzp_live_realKey12345"
        os.environ["RAZORPAY_KEY_SECRET"] = "superSecretKey98765"
        os.environ["MOCK_RAZORPAY"] = "false"
        status = razorpay_service.get_status()
        self.assertTrue(status["configured"])
        self.assertEqual(status["mode"], "LIVE")
        self.assertEqual(status["key_id"], "rzp_...2345")
        # Cleanup
        os.environ["RAZORPAY_KEY_ID"] = ""
        os.environ["RAZORPAY_KEY_SECRET"] = ""

    # 4. Payment import
    def test_04_payment_import(self):
        res = import_payments(self.db, source_override="DEMO")
        self.assertEqual(res["status"], "success")
        self.assertGreater(res["imported_count"], 0)
        self.assertEqual(res["source"], "DEMO")

    # 5. Successful payment
    def test_05_successful_payment(self):
        p_data = {
            "payment_id": "pay_test_succ_01",
            "invoice_id": self.invoice1.invoice_id,
            "buyer_id": self.buyer.id,
            "amount": 100000.0,
            "currency": "INR",
            "status": "SUCCESS",
            "payment_date": date(2026, 7, 25)
        }
        payment = record_payment(self.db, p_data, source="DEMO")
        self.assertEqual(payment.status, "SUCCESS")
        self.assertEqual(payment.amount, 100000.0)

        # Check reconciliation: invoice should now be Paid
        self.db.refresh(self.invoice1)
        self.assertEqual(self.invoice1.payment_status, "Paid")
        self.assertEqual(self.invoice1.actual_payment_date, date(2026, 7, 25))

    # 6. Failed payment
    def test_06_failed_payment(self):
        p_data = {
            "payment_id": "pay_test_fail_01",
            "invoice_id": self.invoice1.invoice_id,
            "buyer_id": self.buyer.id,
            "amount": 100000.0,
            "currency": "INR",
            "status": "FAILED",
            "payment_date": date(2026, 7, 25)
        }
        payment = record_payment(self.db, p_data, source="DEMO")
        self.assertEqual(payment.status, "FAILED")

        # Invoice should remain Outstanding/Overdue, NOT Paid
        self.db.refresh(self.invoice1)
        self.assertNotEqual(self.invoice1.payment_status, "Paid")

    # 7. Refunded payment
    def test_07_refunded_payment(self):
        p_data = {
            "payment_id": "pay_test_ref_01",
            "invoice_id": self.invoice1.invoice_id,
            "buyer_id": self.buyer.id,
            "amount": 100000.0,
            "currency": "INR",
            "status": "REFUNDED",
            "payment_date": date(2026, 7, 25)
        }
        record_payment(self.db, p_data, source="DEMO")
        self.db.refresh(self.invoice1)
        self.assertNotEqual(self.invoice1.payment_status, "Paid")

    # 8. Partial payment
    def test_08_partial_payment(self):
        # Invoice 2 is ₹320,000
        p1 = {
            "payment_id": "pay_part_01",
            "invoice_id": self.invoice2.invoice_id,
            "buyer_id": self.buyer.id,
            "amount": 100000.0,
            "status": "SUCCESS",
            "payment_date": date(2026, 7, 10)
        }
        p2 = {
            "payment_id": "pay_part_02",
            "invoice_id": self.invoice2.invoice_id,
            "buyer_id": self.buyer.id,
            "amount": 120000.0,
            "status": "SUCCESS",
            "payment_date": date(2026, 7, 20)
        }
        record_payment(self.db, p1, source="DEMO")
        record_payment(self.db, p2, source="DEMO")

        timeline = get_invoice_payments(self.db, self.invoice2.invoice_id)
        self.assertEqual(timeline["invoice_amount"], 320000.0)
        self.assertEqual(timeline["total_received"], 220000.0)
        self.assertEqual(timeline["outstanding_amount"], 100000.0)
        self.assertEqual(timeline["payment_status"], "Partially Paid")

    # 9. Invoice reconciliation
    def test_09_invoice_reconciliation(self):
        res = reconcile_invoice(self.db, self.invoice1.invoice_id)
        self.assertEqual(res["invoice_id"], self.invoice1.invoice_id)
        self.assertEqual(res["total_received"], 0.0)

        # Add full payment
        record_payment(self.db, {
            "payment_id": "pay_full_recon",
            "invoice_id": self.invoice1.invoice_id,
            "buyer_id": self.buyer.id,
            "amount": 100000.0,
            "status": "SUCCESS",
            "payment_date": date(2026, 7, 15)
        })
        res2 = reconcile_invoice(self.db, self.invoice1.invoice_id)
        self.assertEqual(res2["payment_status"], "Paid")
        self.assertEqual(res2["outstanding_amount"], 0.0)

    # 10. Duplicate payment prevention (idempotency)
    def test_10_duplicate_payment(self):
        p_data = {
            "payment_id": "pay_idem_001",
            "invoice_id": self.invoice1.invoice_id,
            "buyer_id": self.buyer.id,
            "amount": 50000.0,
            "status": "SUCCESS",
            "payment_date": date(2026, 7, 10)
        }
        p_first = record_payment(self.db, p_data, source="DEMO")
        p_second = record_payment(self.db, p_data, source="DEMO")
        self.assertEqual(p_first.id, p_second.id)

        # Count total records
        count = self.db.query(Payment).filter(Payment.payment_id == "pay_idem_001").count()
        self.assertEqual(count, 1)

    # 11. Buyer payment statistics
    def test_11_buyer_payment_statistics(self):
        # Add payment to invoice 1
        record_payment(self.db, {
            "payment_id": "pay_stats_01",
            "invoice_id": self.invoice1.invoice_id,
            "buyer_id": self.buyer.id,
            "amount": 100000.0,
            "status": "SUCCESS",
            "payment_date": date(2026, 7, 20)
        })
        analysis = get_buyer_payment_analysis(self.db, self.buyer.id)
        self.assertEqual(analysis["total_paid"], 100000.0)
        self.assertEqual(analysis["successful_payment_count"], 1)

    # 12. Payment analysis endpoint
    def test_12_payment_analysis_endpoint(self):
        response = self.client.get(f"/api/buyers/{self.buyer.id}/payment-analysis")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["buyer_name"], self.buyer.name)
        self.assertIn("total_paid", data)
        self.assertIn("total_outstanding", data)

    # 13. Webhook signature validation
    def test_13_webhook_signature_validation(self):
        os.environ["RAZORPAY_WEBHOOK_SECRET"] = "test_webhook_secret_key"
        payload = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_hook_001",
                        "amount": 10000000,
                        "currency": "INR",
                        "status": "captured",
                        "created_at": 1725150000,
                        "notes": {
                            "invoice_id": self.invoice1.invoice_id
                        }
                    }
                }
            }
        })
        sig = hmac.new(
            b"test_webhook_secret_key",
            payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        response = self.client.post(
            "/api/webhooks/razorpay",
            data=payload,
            headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["payment_id"], "pay_hook_001")

        # Invoice should now be marked Paid
        self.db.refresh(self.invoice1)
        self.assertEqual(self.invoice1.payment_status, "Paid")

    # 14. Invalid webhook signature rejection
    def test_14_invalid_webhook(self):
        os.environ["RAZORPAY_WEBHOOK_SECRET"] = "test_webhook_secret_key"
        payload = json.dumps({"event": "payment.captured"})
        response = self.client.post(
            "/api/webhooks/razorpay",
            data=payload,
            headers={"X-Razorpay-Signature": "invalid_bogus_signature", "Content-Type": "application/json"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid webhook signature", response.json()["detail"])

    # 15. Dashboard payment data / integration status API
    def test_15_dashboard_payment_data(self):
        response = self.client.get("/api/integrations/razorpay/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("mode", data)
        self.assertIn("configured", data)
        self.assertNotIn("key_secret", data)

    # 16. Missing credentials safe fallback
    def test_16_missing_credentials(self):
        os.environ["RAZORPAY_KEY_ID"] = ""
        os.environ["RAZORPAY_KEY_SECRET"] = ""
        os.environ["RAZORPAY_WEBHOOK_SECRET"] = ""
        status = razorpay_service.get_status()
        self.assertFalse(status["configured"])
        self.assertEqual(status["mode"], "DEMO")

    # 17. Razorpay API failure / bounded retry
    def test_17_razorpay_api_failure(self):
        # Configure dummy keys but simulate network/API failure
        os.environ["RAZORPAY_KEY_ID"] = "rzp_live_dummy"
        os.environ["RAZORPAY_KEY_SECRET"] = "dummy_secret"
        os.environ["MOCK_RAZORPAY"] = "false"
        service = RazorpayService()
        # Fetching payments should gracefully return empty list, not crash
        payments = service.fetch_payments(count=5)
        self.assertIsInstance(payments, list)
        os.environ["RAZORPAY_KEY_ID"] = ""
        os.environ["RAZORPAY_KEY_SECRET"] = ""

    # 18. Mock Razorpay mode
    def test_18_mock_razorpay_mode(self):
        os.environ["MOCK_RAZORPAY"] = "true"
        service = RazorpayService()
        mock_payments = service.fetch_payments()
        self.assertTrue(len(mock_payments) > 0)
        self.assertEqual(mock_payments[0]["id"], "pay_mock_001")


if __name__ == "__main__":
    unittest.main()
