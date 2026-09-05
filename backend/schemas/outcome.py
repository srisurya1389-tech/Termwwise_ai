from datetime import date, datetime
from pydantic import BaseModel, Field


class OutcomeBase(BaseModel):
    negotiation_id: int
    invoice_id: str
    final_agreed_term: int | None = None
    actual_payment_date: date | None = None
    actual_payment_days: int | None = None
    predicted_payment_days: int | None = None
    prediction_error: int | None = None
    outcome: str
    cash_flow_gap_before: float | None = None
    cash_flow_gap_after: float | None = None


class OutcomeCreate(BaseModel):
    negotiation_id: int
    final_agreed_term: int | None = None
    actual_payment_date: date | None = None
    actual_payment_days: int | None = None
    cash_flow_gap_before: float | None = None
    cash_flow_gap_after: float | None = None


class ScoreBreakdown(BaseModel):
    reasons: list[str]


class OutcomeResponse(OutcomeBase):
    id: int
    buyer_id: int
    days_improved: int
    cash_flow_gap_improvement: float | None
    termwise_outcome_score: int
    score_reasons: list[str]
    created_at: datetime

    class Config:
        from_attributes = True
