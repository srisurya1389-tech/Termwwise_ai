import os
from fastapi import FastAPI, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.database.connection import get_db, init_db
from backend.api import (
    invoices, buyers, forecasts, risks, negotiations, outcomes, integrations, payments,
    customer, admin_requests
)
from backend.services import outcome_service


app = FastAPI(
    title="TermWise AI API",
    description=(
        "Production-style API backend for TermWise AI, exposing predictive "
        "buyer payment intelligence, optimization ranges, automated negotiation strategies, "
        "and customer portal endpoints."
    ),
    version="1.1.0"
)

# --- CORS Configuration ---
allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174")
origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Global Exception Handler (Hide Stack Traces) ---
@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact the administrator."}
    )


# --- Health Check Endpoint ---
@app.get("/health", tags=["system"], summary="Service Health Check")
def health_check():
    return {
        "status": "healthy",
        "service": "termwise-api"
    }


# --- Dashboard Summary Endpoint ---
@app.get("/api/dashboard/summary", tags=["dashboard"], summary="Get Main Summary Metrics")
def read_dashboard_summary(db: Session = Depends(get_db)):
    return outcome_service.get_dashboard_summary(db)


# --- Reset Demo Database Endpoint ---
@app.post("/api/demo/reset", tags=["demo"], summary="Reset Demo Database")
def reset_demo_database():
    from backend.database.seed import seed_database
    try:
        seed_database()
        return {"status": "success", "message": "Demo database successfully reset to synthetic state"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Demo reset failed: {str(e)}"}
        )



# --- Register API Routers ---
# Admin Business Intelligence Routers
app.include_router(invoices.router)
app.include_router(buyers.router)
app.include_router(forecasts.router)
app.include_router(risks.router)
app.include_router(negotiations.router)
app.include_router(outcomes.router)
app.include_router(integrations.router)
app.include_router(payments.router)
app.include_router(admin_requests.router)

# Customer Portal Routers
app.include_router(customer.router)


# Initialize tables when starting up the app (in development SQLite mode)
@app.on_event("startup")
def on_startup():
    init_db()
