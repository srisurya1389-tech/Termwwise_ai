from datetime import datetime
from pydantic import BaseModel, Field


class NegotiationBase(BaseModel):
    invoice_id: str
    round: int
    status: str
    target_term: int
    fallback_term: int
    boundary_term: int
    buyer_latest_offer: int | None = None
    strategy: str
    message: str
    approval_status: str


class NegotiationCreate(BaseModel):
    invoice_id: str = Field(..., min_length=1)


class ResponseInput(BaseModel):
    buyer_message: str = Field(..., min_length=1)


class ActionDetails(BaseModel):
    action: str
    reason: str
    evidence: str
    risk: str
    review_instructions: str


class ResponseAnalysisResponse(BaseModel):
    category: str
    detected_term_days: int | None
    negotiation_status: str
    recommended_action: str
    action_details: ActionDetails
    reasoning: str


class NegotiationResponse(NegotiationBase):
    id: int
    buyer_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
