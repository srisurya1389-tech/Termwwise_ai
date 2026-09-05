from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# --- Company Schemas ---
class CompanyBase(BaseModel):
    name: str
    business_email: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- User Profile Schemas ---
class UserProfileBase(BaseModel):
    email: str
    full_name: str
    role: str = "CUSTOMER"  # "ADMIN" | "CUSTOMER"

class UserProfileCreate(UserProfileBase):
    supabase_user_id: Optional[str] = None
    company_id: Optional[int] = None
    buyer_id: Optional[int] = None

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None

class UserProfileResponse(UserProfileBase):
    id: int
    supabase_user_id: Optional[str] = None
    company_id: Optional[int] = None
    buyer_id: Optional[int] = None
    company_name: Optional[str] = None
    buyer_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Customer Invoices Schemas ---
class CustomerInvoiceItem(BaseModel):
    invoice_id: str
    amount: float
    paid_amount: float
    outstanding_amount: float
    invoice_date: date
    agreed_payment_days: int
    due_date: date
    payment_status: str
    days_until_due: int
    has_active_request: bool = False
    model_config = ConfigDict(from_attributes=True)


class CustomerPaymentItem(BaseModel):
    payment_id: str
    invoice_id: str
    amount: float
    currency: str
    status: str
    payment_date: date
    source: str
    model_config = ConfigDict(from_attributes=True)


class CustomerInvoiceDetail(CustomerInvoiceItem):
    buyer_name: str
    payments: List[CustomerPaymentItem] = []
    active_request: Optional['PaymentRequestResponse'] = None


# --- Payment Request Schemas ---
class PaymentRequestCreate(BaseModel):
    invoice_id: str
    requested_term: int
    requested_date: Optional[date] = None
    reason: str
    message: Optional[str] = None


class AdminRespondRequest(BaseModel):
    action: str  # "APPROVE" | "REJECT" | "COUNTEROFFER"
    counter_term: Optional[int] = None
    counter_date: Optional[date] = None
    counter_message: Optional[str] = None


class CustomerRespondCounter(BaseModel):
    action: str  # "ACCEPT" | "REJECT"


class PaymentRequestResponse(BaseModel):
    id: int
    invoice_id: str
    buyer_id: int
    buyer_name: str
    company_id: Optional[int] = None
    customer_id: Optional[int] = None
    current_term: int
    requested_term: int
    requested_date: Optional[date] = None
    reason: str
    message: Optional[str] = None
    status: str  # "PENDING" | "APPROVED" | "REJECTED" | "COUNTEROFFER"
    counter_term: Optional[int] = None
    counter_date: Optional[date] = None
    counter_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Customer Notification Schemas ---
class CustomerNotificationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    buyer_id: Optional[int] = None
    title: str
    message: str
    type: str  # "INVOICE" | "PAYMENT" | "REQUEST" | "SYSTEM"
    read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Customer Dashboard Summary Schema ---
class CustomerDashboardSummary(BaseModel):
    customer_name: str
    company_name: str
    buyer_id: int
    total_outstanding: float
    total_paid: float
    upcoming_due_30d: float
    open_invoices_count: int
    overdue_count: int
    recent_payments: List[CustomerPaymentItem] = []
    upcoming_invoices: List[CustomerInvoiceItem] = []
    pending_requests_count: int = 0
    unread_notifications_count: int = 0
