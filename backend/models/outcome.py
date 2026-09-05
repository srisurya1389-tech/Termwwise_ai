from datetime import datetime, date
from sqlalchemy import ForeignKey, String, Integer, DateTime, Float, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.base import Base


class Outcome(Base):
    __tablename__ = "outcomes"

    id: Mapped[int] = mapped_column(primary_key=True)
    negotiation_id: Mapped[int] = mapped_column(ForeignKey("negotiations.id", ondelete="CASCADE"))
    invoice_id: Mapped[str] = mapped_column(String(50), index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("buyers.id", ondelete="CASCADE"))
    final_agreed_term: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_payment_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    predicted_payment_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prediction_error: Mapped[int | None] = mapped_column(Integer, nullable=True)
    outcome: Mapped[str] = mapped_column(String(50))
    cash_flow_gap_before: Mapped[float | None] = mapped_column(Float, nullable=True)
    cash_flow_gap_after: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    buyer: Mapped["Buyer"] = relationship(back_populates="outcomes")
    negotiation: Mapped["Negotiation"] = relationship(back_populates="outcome")
