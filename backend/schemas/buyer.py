from datetime import datetime
from pydantic import BaseModel, Field


class BuyerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class BuyerCreate(BuyerBase):
    pass


class BuyerResponse(BuyerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BuyerIntelligence(BaseModel):
    invoice_count: int
    average_payment_days: float
    median_payment_days: float
    late_payment_percentage: float
    risk_level: str
    outstanding_amount: float
    predicted_payment_days: float | None
    predicted_payment_window: str | None
    confidence: str | None


class BuyerDetailResponse(BuyerResponse):
    intelligence: BuyerIntelligence

    class Config:
        from_attributes = True
