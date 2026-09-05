from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.base import Base


class Buyer(Base):
    __tablename__ = "buyers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="buyer", cascade="all, delete-orphan")
    negotiations: Mapped[list["Negotiation"]] = relationship(back_populates="buyer", cascade="all, delete-orphan")
    outcomes: Mapped[list["Outcome"]] = relationship(back_populates="buyer", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="buyer", cascade="all, delete-orphan")

