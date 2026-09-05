from datetime import datetime, date
from sqlalchemy import ForeignKey, String, Date, DateTime, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    invoice_id: Mapped[str] = mapped_column(String(50), index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("buyers.id", ondelete="CASCADE"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    status: Mapped[str] = mapped_column(String(30), index=True)  # SUCCESS, FAILED, REFUNDED, PENDING
    payment_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source: Mapped[str] = mapped_column(String(30), default="DEMO")  # RAZORPAY, DEMO
    raw_metadata: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    buyer: Mapped["Buyer"] = relationship(back_populates="payments")

    @property
    def buyer_name(self) -> str:
        return self.buyer.name if self.buyer else ""


class PaymentAuditLog(Base):
    __tablename__ = "payment_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    invoice_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="INFO")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
