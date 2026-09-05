import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///termwise.db")

# Setup engine with sqlite check for thread safety
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """
    Initialize SQLite database and create all tables.
    """
    # Import models here to ensure they are registered with Base metadata
    from backend.models.buyer import Buyer
    from backend.models.invoice import Invoice
    from backend.models.negotiation import Negotiation
    from backend.models.outcome import Outcome
    
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    FastAPI dependency to retrieve db session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
