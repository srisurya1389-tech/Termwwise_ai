from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.models.base import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    business_email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profiles = relationship("UserProfile", back_populates="company", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    supabase_user_id = Column(String(255), unique=True, nullable=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="CUSTOMER")  # "ADMIN" | "CUSTOMER"
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=True)  # Associated buyer entity for customers
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="profiles")
    buyer = relationship("Buyer", foreign_keys=[buyer_id])
    requests = relationship("PaymentRequest", back_populates="customer")


class PaymentRequest(Base):
    __tablename__ = "payment_requests"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(100), ForeignKey("invoices.invoice_id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("profiles.id"), nullable=True)
    
    current_term = Column(Integer, nullable=False)
    requested_term = Column(Integer, nullable=False)
    requested_date = Column(Date, nullable=True)
    reason = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    
    status = Column(String(50), default="PENDING")  # "PENDING" | "APPROVED" | "REJECTED" | "COUNTEROFFER"
    counter_term = Column(Integer, nullable=True)
    counter_date = Column(Date, nullable=True)
    counter_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    invoice = relationship("Invoice", foreign_keys=[invoice_id])
    buyer = relationship("Buyer", foreign_keys=[buyer_id])
    customer = relationship("UserProfile", foreign_keys=[customer_id], back_populates="requests")


class CustomerNotification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profiles.id"), nullable=True, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="SYSTEM")  # "INVOICE" | "PAYMENT" | "REQUEST" | "SYSTEM"
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
