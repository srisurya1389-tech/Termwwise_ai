from datetime import datetime
from pydantic import BaseModel


class RazorpayStatusResponse(BaseModel):
    configured: bool
    mode: str  # "LIVE" or "DEMO"
    message: str
    key_id: str | None = None  # Masked key if present


class AuditLogResponse(BaseModel):
    id: int
    event_type: str
    payment_id: str | None = None
    invoice_id: str | None = None
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
