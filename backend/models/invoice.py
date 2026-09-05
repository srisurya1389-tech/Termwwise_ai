from datetime import datetime, date
from sqlalchemy import ForeignKey, String, Date, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("buyers.id", ondelete="CASCADE"))
    amount: Mapped[float] = mapped_column(Float)
    invoice_date: Mapped[date] = mapped_column(Date)
    agreed_payment_days: Mapped[int] = mapped_column(default=30) # default agreed term
    due_date: Mapped[date] = mapped_column(Date)
    actual_payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_status: Mapped[str] = mapped_column(String(50), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    buyer: Mapped["Buyer"] = relationship(back_populates="invoices")

    @property
    def buyer_name(self) -> str:
        return self.buyer.name if self.buyer else ""

