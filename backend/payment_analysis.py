"""
TermWise AI - Payment Analysis (Prototype v0.1)

This script reads raw invoice data and converts it into
buyer payment intelligence: average payment time, delay,
late-payment rate, and a simple explainable risk level.

No AI/ML/LLM is used here. Every number is calculated with
plain, transparent arithmetic so the logic can be checked
and trusted before any AI layer is added later.
"""

import csv
from datetime import date, datetime
from collections import defaultdict

CSV_PATH = "../data/sample_invoices.csv"

# A payment is only counted as "late" if it misses the due date by
# more than this many days. A 1-2 day slip is normal noise, not risk.
GRACE_PERIOD_DAYS = 5


def parse_date(date_str):
    """Convert a YYYY-MM-DD string into a date object. Returns None if blank."""
    if not date_str:
        return None
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def load_invoices(path):
    """Read the CSV file and return a list of invoice dictionaries."""
    invoices = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["invoice_amount"] = float(row["invoice_amount"])
            row["agreed_payment_days"] = int(row["agreed_payment_days"])
            row["invoice_date"] = parse_date(row["invoice_date"])
            row["due_date"] = parse_date(row["due_date"])
            row["actual_payment_date"] = parse_date(row["actual_payment_date"])
            invoices.append(row)
    return invoices


def group_by_buyer(invoices):
    """Group invoice records by buyer name."""
    buyers = defaultdict(list)
    for inv in invoices:
        buyers[inv["buyer_name"]].append(inv)
    return buyers


def analyze_buyer(buyer_name, invoices):
    """
    Calculate payment intelligence for one buyer using only paid invoices
    for timing/delay stats, while still counting unpaid overdue invoices
    as a separate risk signal.
    """
    agreed_days = invoices[0]["agreed_payment_days"]

    paid = [inv for inv in invoices if inv["payment_status"] == "Paid"]
    overdue = [inv for inv in invoices if inv["payment_status"] == "Overdue"]
    outstanding_not_due = [inv for inv in invoices if inv["payment_status"] == "Outstanding"]

    payment_days_list = []
    delay_list = []
    late_count = 0

    for inv in paid:
        actual_days = (inv["actual_payment_date"] - inv["invoice_date"]).days
        delay = (inv["actual_payment_date"] - inv["due_date"]).days
        payment_days_list.append(actual_days)
        delay_list.append(delay)
        if delay > GRACE_PERIOD_DAYS:
            late_count += 1

    total_paid = len(paid)
    avg_payment_days = round(sum(payment_days_list) / total_paid, 1) if total_paid else None
    avg_delay = round(sum(delay_list) / total_paid, 1) if total_paid else None
    late_rate = round((late_count / total_paid) * 100, 1) if total_paid else None

    risk = assign_risk(late_rate, avg_delay, len(overdue))

    return {
        "buyer_name": buyer_name,
        "agreed_payment_days": agreed_days,
        "total_invoices": len(invoices),
        "paid_invoices": total_paid,
        "overdue_invoices": len(overdue),
        "outstanding_invoices": len(outstanding_not_due),
        "avg_payment_days": avg_payment_days,
        "avg_delay": avg_delay,
        "late_payment_rate": late_rate,
        "risk": risk,
    }


def assign_risk(late_rate, avg_delay, overdue_count):
    """
    Simple, explainable risk scoring. No ML - just clear thresholds.

    HIGH   : consistently large average delay (>12 days)
             OR multiple invoices currently overdue (>=2)
    MEDIUM : noticeable average delay (>4 days) OR a meaningful late-rate (>20%)
             OR exactly one invoice currently overdue
    LOW    : minor/no delay, low late-rate, nothing currently overdue

    Average delay is the primary signal (it reflects real payment behavior).
    Late-payment rate and overdue count are secondary signals that can
    push a buyer up a tier even if the average delay looks small.
    """
    if late_rate is None:
        # No paid history yet - treat as medium risk until proven otherwise
        return "MEDIUM" if overdue_count == 0 else "HIGH"

    if avg_delay > 12 or overdue_count >= 2:
        return "HIGH"

    if avg_delay > 4 or late_rate > 20 or overdue_count == 1:
        return "MEDIUM"

    return "LOW"


def print_report(buyer_reports):
    """Print a clean, human-readable buyer payment intelligence report."""
    print("=" * 50)
    print("BUYER PAYMENT INTELLIGENCE")
    print("=" * 50)

    # Sort riskiest buyers first (HIGH -> MEDIUM -> LOW)
    risk_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    sorted_reports = sorted(buyer_reports, key=lambda r: risk_order[r["risk"]])

    for r in sorted_reports:
        print(f"\n{r['buyer_name']}")
        print(f"Agreed Payment Term : {r['agreed_payment_days']} days")
        if r["avg_payment_days"] is not None:
            print(f"Average Payment     : {r['avg_payment_days']} days")
            delay_sign = "+" if r["avg_delay"] >= 0 else ""
            print(f"Average Delay       : {delay_sign}{r['avg_delay']} days")
            print(f"Late Payment Rate   : {r['late_payment_rate']}%")
        else:
            print("Average Payment     : No paid invoices yet")
        print(f"Overdue Invoices    : {r['overdue_invoices']}")
        print(f"Outstanding (Not Due): {r['outstanding_invoices']}")
        print(f"Risk                : {r['risk']}")

    print("\n" + "=" * 50)
    print(f"Total Buyers Analyzed: {len(buyer_reports)}")
    print("=" * 50)


def main():
    invoices = load_invoices(CSV_PATH)
    buyers = group_by_buyer(invoices)

    buyer_reports = [
        analyze_buyer(name, buyer_invoices)
        for name, buyer_invoices in buyers.items()
    ]

    print_report(buyer_reports)


if __name__ == "__main__":
    main()
