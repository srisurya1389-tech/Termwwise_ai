from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.services import forecast_service

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("", summary="Get Cash-Flow Forecast Scenarios")
def get_forecast(db: Session = Depends(get_db)):
    return forecast_service.get_cash_flow_forecast(db)
