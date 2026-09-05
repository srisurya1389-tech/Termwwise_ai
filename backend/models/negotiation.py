from datetime import datetime
from sqlalchemy import ForeignKey, String, Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.base import Base


class Negotiation(Base):
    __tablename__ = "negotiations"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[str] = mapped_column(String(50), index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("buyers.id", ondelete="CASCADE"))
    round: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(50), default="INITIAL")
    target_term: Mapped[int] = mapped_column(Integer)
    fallback_term: Mapped[int] = mapped_column(Integer)
    boundary_term: Mapped[int] = mapped_column(Integer)
    buyer_latest_offer: Mapped[int | None] = mapped_column(Integer, nullable=True)
    strategy: Mapped[str] = mapped_column(Text)
    message: Mapped[str] = mapped_column(Text)
    approval_status: Mapped[str] = mapped_column(String(50), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    buyer: Mapped["Buyer"] = relationship(back_populates="negotiations")
    outcome: Mapped["Outcome"] = relationship(back_populates="negotiation", cascade="all, delete-orphan")
