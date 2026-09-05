import csv
import json
import os
from datetime import datetime, date, timedelta
from backend.database.connection import SessionLocal, init_db, engine
from backend.models.base import Base
from backend.models.buyer import Buyer
from backend.models.invoice import Invoice
from backend.models.negotiation import Negotiation
from backend.models.outcome import Outcome
from backend.models.payment import Payment, PaymentAuditLog
from backend.models.customer_portal import Company, UserProfile, PaymentRequest, CustomerNotification
from backend.services.payment_reconciliation import reconcile_all_invoices


def parse_date(date_str):
    if not date_str:
        return None
    try:
        # Match YYYY-MM-DD
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        pass
    try:
        # Match DD/MM/YYYY or D/M/YYYY
        return datetime.strptime(date_str.strip(), "%d/%m/%Y").date()
    except ValueError:
        pass
    return None


def seed_database():
    print("=" * 55)
    print(" TERMWISE DATABASE SEEDING ENGINE")
    print("=" * 55)
    
    # 1. Reset database tables
    print("Resetting database tables...")
    Base.metadata.drop_all(bind=engine)
    init_db()
    
    db = SessionLocal()
    
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "sample_invoices.csv"))
    outcomes_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "negotiation_outcomes.json"))
    
    if not os.path.exists(csv_path):
        print(f"Error: Base CSV file not found at {csv_path}")
        db.close()
        return

    # 2. Seed Company
    print("Seeding company entity...")
    company = Company(
        id=1,
        name="NovaCraft Manufacturing",
        business_email="finance@novacraft.com"
    )
    db.add(company)
    db.commit()

    # 3. Seed Buyers and Invoices from CSV
    print(f"Parsing base invoices from {csv_path}...")
    buyers_cache = {}  # buyer_name -> Buyer object
    
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            buyer_name = row["buyer_name"].strip()
            
            # Get or create Buyer
            if buyer_name not in buyers_cache:
                buyer = db.query(Buyer).filter(Buyer.name == buyer_name).first()
                if not buyer:
                    buyer = Buyer(name=buyer_name)
                    db.add(buyer)
                    db.commit()
                    db.refresh(buyer)
                buyers_cache[buyer_name] = buyer
            
            buyer = buyers_cache[buyer_name]
            
            # Parse dates
            inv_date = parse_date(row["invoice_date"])
            due_date = parse_date(row["due_date"])
            act_date = parse_date(row["actual_payment_date"])
            
            invoice = Invoice(
                invoice_id=row["invoice_id"].strip(),
                buyer_id=buyer.id,
                amount=float(row["invoice_amount"]),
                invoice_date=inv_date,
                agreed_payment_days=int(row["agreed_payment_days"]),
                due_date=due_date,
                actual_payment_date=act_date,
                payment_status=row["payment_status"].strip()
            )
            db.add(invoice)
            
    db.commit()

    # Add additional demo customer invoices for ABC Industries (Stage 13)
    abc_buyer = buyers_cache.get("ABC Industries")
    if abc_buyer:
        inv109 = Invoice(
            invoice_id="INV-109",
            buyer_id=abc_buyer.id,
            amount=180000.0,
            invoice_date=date(2026, 8, 10),
            agreed_payment_days=60,
            due_date=date(2026, 10, 9),
            payment_status="Outstanding"
        )
        inv115 = Invoice(
            invoice_id="INV-115",
            buyer_id=abc_buyer.id,
            amount=240000.0,
            invoice_date=date(2026, 8, 20),
            agreed_payment_days=60,
            due_date=date(2026, 10, 19),
            payment_status="Outstanding"
        )
        db.add_all([inv109, inv115])
        db.commit()

    print("CSV invoices successfully seeded.")

    # 4. Seed Synthetic Demo Outcomes and Negotiations from JSON
    if os.path.exists(outcomes_path):
        print(f"Parsing synthetic outcomes from {outcomes_path}...")
        with open(outcomes_path, mode="r", encoding="utf-8") as f:
            outcomes_data = json.load(f)
            
        for out in outcomes_data:
            buyer_name = out["buyer_name"].strip()
            
            # Ensure buyer exists
            if buyer_name not in buyers_cache:
                buyer = db.query(Buyer).filter(Buyer.name == buyer_name).first()
                if not buyer:
                    buyer = Buyer(name=buyer_name)
                    db.add(buyer)
                    db.commit()
                    db.refresh(buyer)
                buyers_cache[buyer_name] = buyer
                
            buyer = buyers_cache[buyer_name]
            inv_id = out["invoice_id"].strip()
            
            # Get or create invoice
            invoice = db.query(Invoice).filter(Invoice.invoice_id == inv_id).first()
            if not invoice:
                inv_date = parse_date(out.get("negotiation_start_date")) or date(2026, 8, 1)
                due_date = inv_date
                invoice = Invoice(
                    invoice_id=inv_id,
                    buyer_id=buyer.id,
                    amount=out["original_invoice_amount"],
                    invoice_date=inv_date,
                    agreed_payment_days=out["original_payment_term"],
                    due_date=due_date,
                    payment_status="Outstanding"
                )
                db.add(invoice)
                db.commit()
                db.refresh(invoice)
            
            # Create associated Negotiation
            negotiation = Negotiation(
                invoice_id=inv_id,
                buyer_id=buyer.id,
                round=1,
                status=out["negotiation_status"],
                target_term=out["recommended_target_term"],
                fallback_term=out["recommended_fallback_term"],
                boundary_term=out["recommended_boundary"],
                buyer_latest_offer=out["final_agreed_term"] if out["negotiation_status"] == "AGREED" else None,
                strategy=f"SYNTHETIC DEMO STRATEGY for {inv_id}",
                message=f"SYNTHETIC DEMO MESSAGE for {inv_id}",
                approval_status="APPROVED" if out["human_approved"] else "PENDING"
            )
            db.add(negotiation)
            db.commit()
            db.refresh(negotiation)
            
            # Create associated Outcome if negotiation completed
            if out["negotiation_status"] == "AGREED" and out.get("actual_payment_days") is not None:
                act_pay_days = out["actual_payment_days"]
                pred_pay_days = out["original_predicted_payment_days"]
                err = act_pay_days - pred_pay_days if (act_pay_days is not None and pred_pay_days is not None) else None
                act_pay_date = parse_date(out.get("actual_payment_date"))
                
                outcome = Outcome(
                    negotiation_id=negotiation.id,
                    invoice_id=inv_id,
                    buyer_id=buyer.id,
                    final_agreed_term=out["final_agreed_term"],
                    actual_payment_date=act_pay_date,
                    actual_payment_days=act_pay_days,
                    predicted_payment_days=pred_pay_days,
                    prediction_error=err,
                    outcome=out["outcome"],
                    cash_flow_gap_before=out.get("cash_flow_gap_before"),
                    cash_flow_gap_after=out.get("cash_flow_gap_after")
                )
                db.add(outcome)
                
                # Dynamic update: update target invoice record status in DB to Paid
                invoice.payment_status = "Paid"
                invoice.agreed_payment_days = out["final_agreed_term"]
                invoice.actual_payment_date = act_pay_date
                db.add(invoice)
                
            elif out["negotiation_status"] == "REJECTED":
                outcome = Outcome(
                    negotiation_id=negotiation.id,
                    invoice_id=inv_id,
                    buyer_id=buyer.id,
                    final_agreed_term=None,
                    actual_payment_date=None,
                    actual_payment_days=None,
                    predicted_payment_days=out["original_predicted_payment_days"],
                    prediction_error=None,
                    outcome=out["outcome"],
                    cash_flow_gap_before=out.get("cash_flow_gap_before"),
                    cash_flow_gap_after=out.get("cash_flow_gap_after")
                )
                db.add(outcome)
        
        db.commit()
        print("Synthetic JSON outcomes successfully seeded.")

    # 5. Seed Synthetic Demo Payments and Reconcile Invoices (Stage 10)
    print("Parsing and generating synthetic demo payment records...")
    invoices = db.query(Invoice).all()
    for inv in invoices:
        if inv.payment_status.lower() == "paid":
            pay_date = inv.actual_payment_date or inv.due_date or date.today()
            payment = Payment(
                payment_id=f"demo_pay_{inv.invoice_id}",
                invoice_id=inv.invoice_id,
                buyer_id=inv.buyer_id,
                amount=inv.amount,
                currency="INR",
                status="SUCCESS",
                payment_date=pay_date,
                source="DEMO"
            )
            db.add(payment)

    # Partial payment showcase on XYZ / second invoice
    xyz_inv = db.query(Invoice).join(Buyer).filter(Buyer.name.like("%Sunrise%"), Invoice.payment_status != "Paid").first()
    if not xyz_inv:
        xyz_inv = db.query(Invoice).filter(Invoice.payment_status != "Paid").first()

    if xyz_inv:
        part1 = round(xyz_inv.amount * 0.35, 2)
        part2 = round(xyz_inv.amount * 0.40, 2)
        
        p1 = Payment(
            payment_id=f"demo_pay_partial_1_{xyz_inv.invoice_id}",
            invoice_id=xyz_inv.invoice_id,
            buyer_id=xyz_inv.buyer_id,
            amount=part1,
            currency="INR",
            status="SUCCESS",
            payment_date=date(2026, 8, 10),
            source="DEMO"
        )
        p2 = Payment(
            payment_id=f"demo_pay_partial_2_{xyz_inv.invoice_id}",
            invoice_id=xyz_inv.invoice_id,
            buyer_id=xyz_inv.buyer_id,
            amount=part2,
            currency="INR",
            status="SUCCESS",
            payment_date=date(2026, 8, 20),
            source="DEMO"
        )
        db.add_all([p1, p2])

    # 6. Seed Profiles, Payment Requests, and Notifications (Stage 13)
    print("Seeding user profiles and customer portal data...")
    abc_buyer_entity = db.query(Buyer).filter(Buyer.name.like("%ABC%")).first()
    abc_id = abc_buyer_entity.id if abc_buyer_entity else 1

    admin_profile = UserProfile(
        id=1,
        email="admin@novacraft.com",
        full_name="NovaCraft Finance Admin",
        role="ADMIN",
        company_id=1,
        buyer_id=None
    )
    customer_profile = UserProfile(
        id=2,
        email="customer@abcindustries.com",
        full_name="ABC Industries Finance Desk",
        role="CUSTOMER",
        company_id=1,
        buyer_id=abc_id
    )
    db.add_all([admin_profile, customer_profile])
    db.commit()

    # Initial Customer Payment Requests
    req1 = PaymentRequest(
        invoice_id="INV-109",
        buyer_id=abc_id,
        company_id=1,
        customer_id=customer_profile.id,
        current_term=60,
        requested_term=75,
        requested_date=date(2026, 10, 24),
        reason="Supply chain quarterly procurement alignment",
        message="Requesting a 15-day extension to align with our quarterly raw material delivery milestone.",
        status="PENDING"
    )
    req2 = PaymentRequest(
        invoice_id="INV-S04",
        buyer_id=3, # Sunrise Distributors
        company_id=1,
        customer_id=None,
        current_term=30,
        requested_term=60,
        requested_date=date(2026, 9, 8),
        reason="Working capital liquidity management",
        message="Requesting 60 days net terms for the monsoon batch order.",
        status="COUNTEROFFER",
        counter_term=45,
        counter_date=date(2026, 8, 24),
        counter_message="We can offer 45 days net terms to support your operations while maintaining baseline cash flow."
    )
    db.add_all([req1, req2])

    # Initial Customer Notifications
    n1 = CustomerNotification(
        buyer_id=abc_id,
        user_id=customer_profile.id,
        title="Welcome to Customer Portal",
        message="View your invoices, download payment receipts, and submit payment term requests directly.",
        type="SYSTEM",
        read=True
    )
    n2 = CustomerNotification(
        buyer_id=abc_id,
        user_id=customer_profile.id,
        title="Invoice INV-102 Available",
        message="New invoice INV-102 (₹3,20,000) has been posted to your account. Contractual due date: Oct 30, 2026.",
        type="INVOICE",
        read=False
    )
    n3 = CustomerNotification(
        buyer_id=abc_id,
        user_id=customer_profile.id,
        title="Extension Request In Review",
        message="Your extension request for INV-109 (75 days) is being reviewed by NovaCraft finance.",
        type="REQUEST",
        read=False
    )
    db.add_all([n1, n2, n3])

    # Add initial audit log entry
    audit_init = PaymentAuditLog(
        event_type="SYSTEM_INIT",
        message="TermWise AI Dual-Role Platform Initialized (Admin + Customer Portal).",
        status="INFO"
    )
    db.add(audit_init)
    db.commit()

    # Reconcile all invoices with payments
    reconciled_count = reconcile_all_invoices(db)
    print(f"Synthetic demo payments seeded. {reconciled_count} invoices reconciled.")
        
    db.close()
    print("=" * 55)
    print(" DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    print("=" * 55)


if __name__ == "__main__":
    seed_database()
