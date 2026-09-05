import unittest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.models.base import Base
from backend.models.buyer import Buyer
from backend.models.invoice import Invoice
from backend.models.customer_portal import Company, UserProfile, CustomerNotification
from backend.database.connection import get_db
from backend.main import app

class TestCustomerPortal(unittest.TestCase):
    def setUp(self):
        # Create isolated in-memory SQLite database
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        self.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

        self.db = self.TestingSessionLocal()

        def override_get_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Seed Company
        self.company = Company(name="NovaCraft Manufacturing", business_email="admin@novacraft.com")
        self.db.add(self.company)
        self.db.commit()
        self.db.refresh(self.company)

        # Seed Buyer
        self.buyer = Buyer(name="ABC Industries")
        self.db.add(self.buyer)
        self.db.commit()
        self.db.refresh(self.buyer)

        # Seed User Profiles
        self.admin_profile = UserProfile(
            email="admin@novacraft.com",
            full_name="NovaCraft Operations Admin",
            role="ADMIN",
            company_id=self.company.id
        )
        self.customer_profile = UserProfile(
            email="customer@abcindustries.com",
            full_name="ABC Industries Finance Team",
            role="CUSTOMER",
            buyer_id=self.buyer.id,
            company_id=self.company.id
        )
        self.db.add_all([self.admin_profile, self.customer_profile])
        self.db.commit()

        # Seed Invoices
        self.inv101 = Invoice(
            invoice_id="INV-101",
            buyer_id=self.buyer.id,
            amount=500000.0,
            invoice_date=date(2026, 8, 1),
            agreed_payment_days=60,
            due_date=date(2026, 9, 30),
            payment_status="Outstanding"
        )
        self.inv109 = Invoice(
            invoice_id="INV-109",
            buyer_id=self.buyer.id,
            amount=350000.0,
            invoice_date=date(2026, 8, 15),
            agreed_payment_days=45,
            due_date=date(2026, 9, 29),
            payment_status="Outstanding"
        )
        self.db.add_all([self.inv101, self.inv109])

        # Seed Notification
        self.notif = CustomerNotification(
            buyer_id=self.buyer.id,
            title="Invoice Issued",
            message="Invoice INV-109 has been generated.",
            type="INVOICE",
            read=False
        )
        self.db.add(self.notif)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_customer_dashboard_overview(self):
        """Verify customer dashboard returns safe metrics without leaking internal risk scores."""
        response = self.client.get("/api/customer/dashboard?email=customer@abcindustries.com")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["customer_name"], "ABC Industries")
        self.assertIn("total_outstanding", data)
        self.assertIn("total_paid", data)
        self.assertIn("upcoming_due_30d", data)
        # Ensure internal sensitive supplier analytics are NOT in customer summary
        self.assertNotIn("risk_score", data)
        self.assertNotIn("priority_score", data)
        self.assertNotIn("cash_flow_gap", data)

    def test_customer_invoices_list(self):
        """Verify customer only gets invoices belonging to their buyer account."""
        response = self.client.get("/api/customer/invoices?email=customer@abcindustries.com")
        self.assertEqual(response.status_code, 200)
        invoices = response.json()
        self.assertTrue(len(invoices) > 0)
        for inv in invoices:
            self.assertIn("invoice_id", inv)
            self.assertIn("amount", inv)
            self.assertIn("outstanding_amount", inv)
            self.assertIn("payment_status", inv)
            self.assertNotIn("risk_score", inv)
            self.assertNotIn("priority_score", inv)

    def test_customer_invoice_detail(self):
        """Verify invoice detail includes payment timeline for customer."""
        response = self.client.get("/api/customer/invoices/INV-101?email=customer@abcindustries.com")
        self.assertEqual(response.status_code, 200)
        detail = response.json()
        self.assertEqual(detail["invoice_id"], "INV-101")
        self.assertEqual(detail["buyer_name"], "ABC Industries")
        self.assertIn("payments", detail)

    def test_customer_payment_extension_flow(self):
        """Test end-to-end payment extension request, admin counteroffer, and customer acceptance."""
        # 1. Customer submits extension request on INV-109
        post_res = self.client.post(
            "/api/customer/requests?email=customer@abcindustries.com",
            json={
                "invoice_id": "INV-109",
                "requested_term": 90,
                "reason": "Quarterly Cash Flow Alignment",
                "message": "We need 90 days due to delayed distributor settlement."
            }
        )
        self.assertEqual(post_res.status_code, 201)
        req_data = post_res.json()
        req_id = req_data["id"]
        self.assertEqual(req_data["status"], "PENDING")
        self.assertEqual(req_data["requested_term"], 90)

        # 2. Admin retrieves requests and counteroffers with 75 days
        admin_res = self.client.get("/api/admin/requests?status=PENDING")
        self.assertEqual(admin_res.status_code, 200)
        pending_list = admin_res.json()
        self.assertTrue(any(r["id"] == req_id for r in pending_list))

        counter_res = self.client.post(
            f"/api/admin/requests/{req_id}/respond",
            json={
                "action": "COUNTEROFFER",
                "counter_term": 75,
                "counter_message": "We can offer 75 days as a compromise."
            }
        )
        self.assertEqual(counter_res.status_code, 200)
        counter_data = counter_res.json()
        self.assertEqual(counter_data["status"], "COUNTEROFFER")
        self.assertEqual(counter_data["counter_term"], 75)

        # 3. Customer accepts counteroffer
        accept_res = self.client.post(
            f"/api/customer/requests/{req_id}/respond?email=customer@abcindustries.com",
            json={
                "action": "ACCEPT"
            }
        )
        self.assertEqual(accept_res.status_code, 200)
        accepted_data = accept_res.json()
        self.assertEqual(accepted_data["status"], "APPROVED")

        # 4. Verify invoice term was updated to 75 days
        inv_res = self.client.get("/api/customer/invoices/INV-109?email=customer@abcindustries.com")
        self.assertEqual(inv_res.status_code, 200)
        self.assertEqual(inv_res.json()["agreed_payment_days"], 75)

    def test_customer_notifications(self):
        """Test customer notifications and mark-as-read."""
        res = self.client.get("/api/customer/notifications?email=customer@abcindustries.com")
        self.assertEqual(res.status_code, 200)
        notifs = res.json()
        self.assertTrue(len(notifs) > 0)
        first_id = notifs[0]["id"]

        # Mark read
        read_res = self.client.post(f"/api/customer/notifications/{first_id}/read?email=customer@abcindustries.com")
        self.assertEqual(read_res.status_code, 200)

    def test_user_profiles_admin_and_customer(self):
        """Test profile lookup for both admin and customer."""
        admin_prof = self.client.get("/api/customer/profile?email=admin@novacraft.com&role=ADMIN").json()
        self.assertEqual(admin_prof["role"], "ADMIN")
        self.assertEqual(admin_prof["company_name"], "NovaCraft Manufacturing")

        cust_prof = self.client.get("/api/customer/profile?email=customer@abcindustries.com&role=CUSTOMER").json()
        self.assertEqual(cust_prof["role"], "CUSTOMER")
        self.assertEqual(cust_prof["buyer_name"], "ABC Industries")

if __name__ == "__main__":
    unittest.main()
