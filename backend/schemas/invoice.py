from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator


class InvoiceBase(BaseModel):
    invoice_id: str = Field(..., min_length=1, max_length=50)
    buyer_name: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., description="Invoice amount must be greater than zero")
    invoice_date: date
    agreed_payment_days: int = Field(30, ge=1, description="Agreed payment days must be greater than zero")
    due_date: date
    actual_payment_date: date | None = None
    payment_status: str = Field("Outstanding", max_length=50)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Invoice amount must be greater than zero")
        return value


class InvoiceCreate(BaseModel):
    invoice_id: str = Field(..., min_length=1)
    buyer_name: str = Field(..., min_length=1)
    amount: float
    invoice_date: date
    agreed_payment_days: int = Field(30, ge=1)
    due_date: date

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Invoice amount must be greater than zero")
        return value


class InvoiceUpdate(BaseModel):
    amount: float | None = None
    agreed_payment_days: int | None = None
    due_date: date | None = None
    actual_payment_date: date | None = None
    payment_status: str | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: float | None) -> float | None:
        if value is not None and value <= 0:
            raise ValueError("Invoice amount must be greater than zero")
        return value


class InvoiceResponse(InvoiceBase):
    id: int
    buyer_id: int
    created_at: datetime

    class Config:
        from_attributes = True
