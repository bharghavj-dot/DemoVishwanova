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

# Load .env file
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass  # python-dotenv not installed, use system env vars

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
from backend.routers.doctor_dashboard import router as doctor_dashboard_router
from backend.routers.voice_agent import router as voice_router

app.include_router(auth_router)
app.include_router(diagnose_router)
app.include_router(reports_router)
app.include_router(qa_router)
app.include_router(doctors_router)
app.include_router(family_router)
app.include_router(profile_router)
app.include_router(doctor_dashboard_router)
app.include_router(voice_router)


# ── Temporary Migration Endpoint ──────────────────────────────────────────────
@app.get("/migrate_db")
def migrate_db(db: Session = Depends(get_db)):
    """Run ALTER TABLE commands on live database."""
    from sqlalchemy import text
    try:
        alter_statements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);",
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS call_sid VARCHAR(50);",
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS call_transcript JSON;",
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS voice_analysis JSON;",
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS voice_status VARCHAR(20) DEFAULT 'none';",
            "ALTER TABLE reports ADD COLUMN IF NOT EXISTS call_transcript JSON;",
            "ALTER TABLE reports ADD COLUMN IF NOT EXISTS voice_analysis JSON;"
        ]
        stats = []
        for stmt in alter_statements:
            db.execute(text(stmt))
            stats.append(f"Executed: {stmt}")
        db.commit()
        return {"status": "success", "message": "All columns added successfully", "logs": stats}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}


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

@app.get("/sync-family")
def sync_family_members():
    from backend.database import SessionLocal
    from backend.models.db_models import FamilyMember, User
    from sqlalchemy import text
    try:
        with SessionLocal() as db:
            pending = db.query(FamilyMember).filter(FamilyMember.linked_user_id == None, FamilyMember.pending_email != None).all()
            linked_count = 0
            for m in pending:
                clean_email = m.pending_email.strip().lower()
                user = db.query(User).filter(User.email.ilike(clean_email)).first()
                if user:
                    m.linked_user_id = user.id
                    m.pending_email = None
                    linked_count += 1
            if linked_count > 0:
                db.commit()
            return {"message": f"Successfully synced {linked_count} family members."}
    except Exception as e:
        return {"error": str(e)}
