"""
Trilens Router — Scan / Diagnose (PostgreSQL)
================================================
Endpoints: POST /scan/upload/{scan_type}, POST /scan/analyze, GET /scan/session/{session_id}
Matches Image Analysis.png page.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import crud
from backend.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CaptureQuality,
    DiseaseResult,
    ScanType,
    ScanUploadResponse,
    SessionStatusResponse,
)
from backend.pipeline.extractor_client import extract_features_from_upload
from backend.pipeline.orchestrator import DISPLAY_NAMES, merge_and_classify
from backend.routers.auth import get_current_user_dep

router = APIRouter(prefix="/scan", tags=["Scan & Diagnosis"])


# ── POST /scan/upload/{scan_type} ─────────────────────────────────────────────

@router.post("/upload/{scan_type}", response_model=ScanUploadResponse)
async def upload_scan(
    scan_type: ScanType,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Upload an image for one scan type (eye, tongue, or nail).
    Immediately runs the feature extractor and returns extracted features.
    """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG, TIFF)")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Find or create session
    session = crud.get_active_session(db, user["id"])
    if not session:
        session = crud.create_session(db, user["id"])

    # Run extractor
    features = await extract_features_from_upload(
        file_bytes=file_bytes,
        scan_type=scan_type.value,
        session_id=session.id,
    )

    # Update session with new upload data
    uploads = dict(session.uploads or {"eye": False, "tongue": False, "nail": False})
    uploads[scan_type.value] = True

    feat_store = dict(session.features or {})
    feat_store[scan_type.value] = features

    crud.update_session(db, session, uploads=uploads, features=feat_store, status="uploading")

    return ScanUploadResponse(
        session_id=session.id,
        scan_type=scan_type,
        features=features,
        status="extracted",
        capture_quality=CaptureQuality(),
    )


# ── POST /scan/analyze ───────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_scan(
    req: AnalyzeRequest,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Merge features from all 3 uploads and run XGBoost classification.
    """
    session = crud.get_session(db, req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    uploads = session.uploads or {}
    missing = [t for t in ["eye", "tongue", "nail"] if not uploads.get(t)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing scan uploads: {', '.join(missing)}. Upload all 3 before analyzing.",
        )

    # Merge features
    merged = {}
    for scan_features in (session.features or {}).values():
        merged.update(scan_features)

    crud.update_session(db, session, merged_features=merged, status="analyzing")

    # Run XGBoost classification
    try:
        result = merge_and_classify(merged)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

    # Update session
    crud.update_session(
        db, session,
        top3=result["top3"],
        priors=result["priors"],
        top3_tuples=result["top3_tuples"],
        status="analyzed",
    )

    # Create initial report
    top_disease = result["top3"][0]
    from backend.pipeline.bayesian_client import generate_final_output
    initial_output = generate_final_output(result["priors"])

    crud.create_report(
        db,
        session_id=req.session_id,
        user_id=user["id"],
        primary_disease=top_disease["disease"],
        confidence=top_disease["probability"],
        severity=initial_output["severity"],
        top3=result["top3"],
        precautions=initial_output["precautions"],
    )

    return AnalyzeResponse(
        session_id=req.session_id,
        features=merged,
        top3=[DiseaseResult(**e) for e in result["top3"]],
        priors=result["priors"],
        status="analyzed",
    )


# ── GET /scan/session/{session_id} ───────────────────────────────────────────

@router.get("/session/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get the current state of a diagnostic session."""
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    report = crud.get_report_by_session(db, session_id)

    return SessionStatusResponse(
        session_id=session_id,
        status=session.status,
        uploads=session.uploads or {"eye": False, "tongue": False, "nail": False},
        has_report=report is not None,
        has_final_report=report.is_final if report else False,
        qa_started=session.status in ("qa_started", "qa_completed", "finalized"),
        qa_completed=session.status in ("qa_completed", "finalized"),
    )
