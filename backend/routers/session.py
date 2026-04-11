"""
Trilens Router — User Profile (PostgreSQL)
============================================
Endpoints: GET /profile, PUT /profile, GET /profile/records
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import crud
from backend.models.schemas import (
    ClinicalRecord,
    ClinicalRecordsResponse,
    ProfileResponse,
    ProfileUpdateRequest,
)
from backend.pipeline.orchestrator import DISPLAY_NAMES
from backend.routers.auth import get_current_user_dep

router = APIRouter(prefix="/profile", tags=["User Profile"])


@router.get("", response_model=ProfileResponse)
async def get_profile(
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    # Fetch latest user from db
    db_user = crud.get_user_by_id(db, user["id"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return ProfileResponse(
        id=db_user.id,
        patient_id=db_user.patient_id or db_user.id,
        full_name=db_user.full_name,
        email=db_user.email,
        role=db_user.role,
        clinical_stability="High",
        member_since=db_user.created_at.isoformat()[:10] if db_user.created_at else "2024-01-01",
        avatar_url=db_user.avatar_url,
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    req: ProfileUpdateRequest,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    db_user = crud.get_user_by_id(db, user["id"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.full_name is not None:
        db_user.full_name = req.full_name
    if req.email is not None:
        db_user.email = req.email
    if req.avatar_url is not None:
        db_user.avatar_url = req.avatar_url

    db.commit()
    db.refresh(db_user)

    return await get_profile(user={"id": db_user.id}, db=db)


@router.get("/records", response_model=ClinicalRecordsResponse)
async def get_clinical_records(
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    reports = crud.get_user_reports(db, user["id"])

    records = [
        ClinicalRecord(
            session_id=r.session_id,
            report_id=r.id,
            primary_disease=DISPLAY_NAMES.get(r.primary_disease, r.primary_disease),
            confidence=r.confidence,
            severity=r.severity,
            created_at=r.created_at.isoformat() + "Z" if r.created_at else "",
        )
        for r in reports
    ]

    return ClinicalRecordsResponse(records=records)
