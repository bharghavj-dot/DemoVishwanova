"""
Trilens Backend — FastAPI Application Entry Point (PostgreSQL)
================================================================
Main application setup with CORS, router registration, DB creation, and startup events.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is on sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from backend.database import Base, engine
from backend.models.schemas import HealthResponse

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Trilens API",
    description="Clinical Health Insights Through Visual Biomarkers (PostgreSQL).",
    version="1.0.0",
)

_startup_time = time.time()

# ── CORS ──────────────────────────────────────────────────────────────────────
_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from backend.routers.auth import router as auth_router
from backend.routers.diagnose import router as diagnose_router
from backend.routers.doctor_dashboard import router as doctor_dashboard_router
from backend.routers.doctors import router as doctors_router
from backend.routers.family import router as family_router
from backend.routers.qa import router as qa_router
from backend.routers.reports import router as reports_router
from backend.routers.session import router as profile_router

app.include_router(auth_router)
app.include_router(diagnose_router)
app.include_router(reports_router)
app.include_router(qa_router)
app.include_router(doctors_router)
app.include_router(family_router)
app.include_router(profile_router)
app.include_router(doctor_dashboard_router)


# ── Startup Event ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    try:
        from backend.pipeline.orchestrator import get_classifier
        get_classifier()
        print("[startup] XGBoost classifier loaded successfully")
        print("[startup] PostgreSQL connection established")
    except Exception as e:
        print(f"[startup] WARNING: {e}")

    # Auto-seed demo data if the database is empty
    try:
        from backend.seed import seed
        seed()
    except Exception as e:
        print(f"[startup] Seed skipped or failed: {e}")


# ── Health & Root ─────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    uptime = int(time.time() - _startup_time)
    hours, r = divmod(uptime, 3600)
    minutes, seconds = divmod(r, 60)
    return HealthResponse(
        status="ok",
        version="1.0.0",
        uptime=f"{hours}h {minutes}m {seconds}s",
    )

@app.get("/", tags=["System"])
async def root():
    return {"message": "Trilens API v1.0.0", "docs": "/docs", "health": "/health"}
