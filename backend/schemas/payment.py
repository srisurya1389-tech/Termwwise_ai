from datetime import date, datetime
from pydantic import BaseModel, Field


class PaymentBase(BaseModel):
    payment_id: str = Field(..., min_length=1, max_length=100)
    invoice_id: str = Field(..., min_length=1, max_length=50)
    buyer_id: int
    amount: float = Field(..., gt=0, description="Payment amount must be greater than zero")
    currency: str = Field("INR", max_length=10)
    status: str = Field("SUCCESS", description="SUCCESS, FAILED, REFUNDED, PENDING")
    payment_date: date
    source: str = Field("DEMO", description="RAZORPAY, DEMO")


class PaymentCreate(PaymentBase):
    raw_metadata: str | None = None


class PaymentResponse(PaymentBase):
    id: int
    buyer_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentTimelineItem(BaseModel):
    payment_id: str
    amount: float
    currency: str
    status: str
    payment_date: date
    source: str


class PaymentTimeline(BaseModel):
    invoice_id: str
    invoice_amount: float
    total_received: float
    outstanding_amount: float
    payment_status: str
    payments: list[PaymentTimelineItem]


class BuyerPaymentAnalysis(BaseModel):
    buyer_id: int
    buyer_name: str
    total_paid: float
    total_outstanding: float
    average_payment_days: float
    median_payment_days: float
    late_payment_count: int
    late_payment_percentage: float
    partial_payment_count: int
    successful_payment_count: int
    recent_payments: list[PaymentResponse] = []


class PaymentImportResponse(BaseModel):
    status: str
    imported_count: int
    reconciled_invoices_count: int
    mode: str
    source: str
    message: str
