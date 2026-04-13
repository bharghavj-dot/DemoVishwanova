"""
Trilens Router — Family Dashboard (PostgreSQL)
================================================
Endpoints: GET /family/members, POST /family/members, GET /family/members/{member_id}/reports
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import crud
from backend.models.schemas import (
    FamilyDashboardResponse,
    FamilyMemberCreate,
    FamilyMemberResponse,
    ReportSummary,
)
from backend.pipeline.orchestrator import DISPLAY_NAMES
from backend.routers.auth import get_current_user_dep

router = APIRouter(prefix="/family", tags=["Family Dashboard"])


@router.get("/members", response_model=FamilyDashboardResponse)
async def list_family_members(
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    members = crud.get_family_members(db, user["id"])
    member_responses = []

    for m in members:
        reports = []
        if m.linked_user_id:
            user_reports = crud.get_user_reports(db, m.linked_user_id)
            for r in user_reports:
                reports.append(ReportSummary(
                    session_id=r.session_id,
                    primary_disease=DISPLAY_NAMES.get(r.primary_disease, r.primary_disease),
                    confidence=r.confidence,
                    severity=r.severity,
                    created_at=r.created_at.isoformat() + "Z" if r.created_at else "",
                    is_final=r.is_final,
                ))

        member_responses.append(FamilyMemberResponse(
            id=m.id,
            name=m.name,
            relationship=m.relationship_,
            status=m.status,
            avatar_url=m.avatar_url,
            has_new_report=m.has_new_report,
            reports=reports,
        ))

    return FamilyDashboardResponse(members=member_responses)


@router.post("/members", response_model=FamilyMemberResponse, status_code=201)
async def add_family_member(
    req: FamilyMemberCreate,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    linked_user_id = None
    pending_email = None
    if req.email:
        linked_user = crud.get_user_by_email(db, req.email)
        if linked_user:
            if linked_user.role == "doctor":
                raise HTTPException(status_code=400, detail="Doctors cannot be added as family members.")
            linked_user_id = linked_user.id
        else:
            pending_email = req.email.strip()

    member = crud.create_family_member(
        db,
        guardian_id=user["id"],
        name=req.name,
        relationship=req.relationship,
        linked_user_id=linked_user_id,
        pending_email=pending_email,
    )

    return FamilyMemberResponse(
        id=member.id,
        name=member.name,
        relationship=member.relationship_,
        status=member.status,
        avatar_url=member.avatar_url,
        has_new_report=member.has_new_report,
        reports=[],
    )


@router.get("/members/{member_id}/reports", response_model=list[ReportSummary])
async def get_member_reports(
    member_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    member = crud.get_family_member(db, member_id)
    if not member or member.guardian_id != user["id"]:
        raise HTTPException(status_code=404, detail="Family member not found")

    if not member.linked_user_id:
        return []

    user_reports = crud.get_user_reports(db, member.linked_user_id)
    return [
        ReportSummary(
            session_id=r.session_id,
            primary_disease=DISPLAY_NAMES.get(r.primary_disease, r.primary_disease),
            confidence=r.confidence,
            severity=r.severity,
            created_at=r.created_at.isoformat() + "Z" if r.created_at else "",
            is_final=r.is_final,
        )
        for r in user_reports
    ]
