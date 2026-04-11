"""
Trilens Router — Reports (PostgreSQL)
========================================
Endpoints: GET /reports/{session_id}, GET /reports/{session_id}/final,
           GET /reports/{session_id}/pdf, GET /reports/history
Matches Report.png and Final_Report.png pages.
"""

from __future__ import annotations

import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import crud
from backend.models.schemas import (
    DiseaseResult,
    DoctorCard,
    FinalReportResponse,
    MedicationItem,
    ReportHistoryResponse,
    ReportResponse,
    ReportSummary,
)
from backend.pipeline.orchestrator import DISPLAY_NAMES, SEVERITY_NOTES
from backend.routers.auth import get_current_user_dep

router = APIRouter(prefix="/reports", tags=["Reports"])


# ── GET /reports/history ──────────────────────────────────────────────────────

@router.get("/history", response_model=ReportHistoryResponse)
async def get_report_history(
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get all reports for the current user."""
    reports = crud.get_user_reports(db, user["id"])

    summaries = [
        ReportSummary(
            session_id=r.session_id,
            primary_disease=DISPLAY_NAMES.get(r.primary_disease, r.primary_disease),
            confidence=r.confidence,
            severity=r.severity,
            created_at=r.created_at.isoformat() + "Z" if r.created_at else "",
            is_final=r.is_final,
        )
        for r in reports
    ]

    return ReportHistoryResponse(reports=summaries)


# ── GET /reports/{session_id} ─────────────────────────────────────────────────

@router.get("/{session_id}", response_model=ReportResponse)
async def get_report(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get the initial diagnostic report (before Q&A)."""
    report = crud.get_report_by_session(db, session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found for this session")
    if report.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Report belongs to another user")

    primary = report.primary_disease
    severity = report.severity
    created = report.created_at.isoformat() + "Z" if report.created_at else ""

    return ReportResponse(
        session_id=session_id,
        primary_disease=primary,
        primary_display_name=DISPLAY_NAMES.get(primary, primary.replace("_", " ").title()),
        confidence=report.confidence,
        severity=severity,
        severity_note=SEVERITY_NOTES.get(severity, "Consult a healthcare professional"),
        top3=[
            DiseaseResult(
                disease=e["disease"],
                probability=e["probability"],
                display_name=DISPLAY_NAMES.get(e["disease"], e["disease"]),
            )
            for e in (report.top3 or [])
        ],
        precautions=report.precautions or [],
        created_at=created,
        last_scanned=created,
    )


# ── GET /reports/{session_id}/final ───────────────────────────────────────────

@router.get("/{session_id}/final", response_model=FinalReportResponse)
async def get_final_report(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get the final diagnostic report after Q&A completion."""
    report = crud.get_report_by_session(db, session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Report belongs to another user")

    if not report.is_final or not report.final_data:
        raise HTTPException(
            status_code=400,
            detail="Final report not yet available. Complete the Q&A session first.",
        )

    final = report.final_data
    session = crud.get_session(db, session_id)
    qa_probs = (session.qa_probabilities or {}) if session else {}

    # Build probable pathologies
    ranked = sorted(qa_probs.items(), key=lambda x: x[1], reverse=True)
    pathologies = [
        DiseaseResult(
            disease=d, probability=p,
            display_name=DISPLAY_NAMES.get(d, d.replace("_", " ").title()),
        )
        for d, p in ranked
    ]

    top_disease = ranked[0][0] if ranked else report.primary_disease
    top_prob = ranked[0][1] if ranked else report.confidence

    # Mandatory clinical action
    action = None
    if final.get("see_doctor_flag"):
        display = DISPLAY_NAMES.get(top_disease, top_disease)
        action = (
            f"Due to a {top_prob:.0%} match confidence in visual markers, "
            f"a Professional Consultation is Recommended within 48 hours. "
            f"Immediate clinical review is necessary for {display}."
        )

    meds = [
        MedicationItem(
            name=m.split("(")[0].strip(),
            dosage=m.split("(")[1].rstrip(")") if "(" in m else "As directed",
        )
        for m in final.get("medications", [])
    ]

    # Recommend top 3 doctors
    all_doctors = crud.get_all_doctors(db)
    recommended = [
        DoctorCard(
            id=d.id, name=d.name, specialty=d.specialty,
            specialties=d.specialties or [], verified=d.verified,
            rating=d.rating, review_count=d.review_count, fee=d.fee,
            availability=d.availability or "", distance=d.distance,
        )
        for d in all_doctors[:3]
    ]

    finalized_at = report.finalized_at.isoformat() + "Z" if report.finalized_at else ""
    created_at = report.created_at.isoformat() + "Z" if report.created_at else ""

    return FinalReportResponse(
        session_id=session_id,
        report_id=report.id,
        patient_name=user["full_name"],
        generated_at=finalized_at or created_at,
        diagnostic_confidence=top_prob,
        primary_disease=top_disease,
        primary_display_name=DISPLAY_NAMES.get(top_disease, top_disease),
        severity=final["severity"],
        probable_pathologies=pathologies,
        mandatory_clinical_action=action,
        medications=meds,
        precautions=final["precautions"],
        escalation_flags=final["escalation_flags"],
        see_doctor_flag=final["see_doctor_flag"],
        recommended_specialists=recommended,
    )


# ── GET /reports/{session_id}/pdf ─────────────────────────────────────────────

@router.get("/{session_id}/pdf")
async def download_pdf_report(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Generate and download the diagnostic report as a PDF."""
    report = crud.get_report_by_session(db, session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Report belongs to another user")

    # Convert ORM to dict for PDF generator
    report_dict = {
        "report_id": report.id,
        "session_id": report.session_id,
        "primary_disease": report.primary_disease,
        "confidence": report.confidence,
        "severity": report.severity,
        "top3": report.top3 or [],
        "precautions": report.precautions or [],
        "created_at": report.created_at.isoformat() if report.created_at else "",
        "final_data": report.final_data or {},
    }

    pdf_bytes = _generate_pdf(report_dict, user)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Trilens_Report_{session_id}.pdf"'},
    )


def _generate_pdf(report: dict, user: dict) -> bytes:
    """Generate a simple text-based PDF for the diagnostic report."""
    final = report.get("final_data", {})
    primary = report["primary_disease"]
    display = DISPLAY_NAMES.get(primary, primary.replace("_", " ").title())
    confidence = report["confidence"]
    severity = final.get("severity", report.get("severity", "Unknown"))

    lines = [
        "TRILENS DIAGNOSTIC REPORT",
        "=" * 50, "",
        f"Report ID: {report['report_id']}",
        f"Patient: {user['full_name']}",
        f"Patient ID: {user.get('patient_id', 'N/A')}",
        f"Generated: {report['created_at']}",
        "", "-" * 50, "PRIMARY DIAGNOSIS", "-" * 50,
        f"  Condition: {display}",
        f"  Confidence: {confidence:.0%}",
        f"  Severity: {severity}", "",
    ]

    lines.append("PROBABLE PATHOLOGIES")
    lines.append("-" * 50)
    for i, entry in enumerate(report.get("top3", []), 1):
        d_name = DISPLAY_NAMES.get(entry["disease"], entry["disease"])
        lines.append(f"  {i}. {d_name}: {entry['probability']:.0%} Match")
    lines.append("")

    precautions = final.get("precautions", report.get("precautions", []))
    if precautions:
        lines += ["PRECAUTIONS", "-" * 50] + [f"  * {p}" for p in precautions] + [""]

    medications = final.get("medications", [])
    if medications:
        lines += ["RECOMMENDED MEDICATIONS", "-" * 50] + [f"  * {m}" for m in medications] + [""]

    flags = final.get("escalation_flags", [])
    if flags:
        lines += ["ESCALATION FLAGS", "-" * 50] + [f"  ! {f}" for f in flags] + [""]

    lines += [
        "=" * 50, "MEDICAL DISCLAIMER",
        "Trilens is a diagnostic support tool and does not",
        "provide clinical diagnoses. Please consult with a",
        "qualified healthcare professional.",
        "=" * 50, "", "(c) 2024 Trilens Medical Systems. All rights reserved.",
    ]

    content = "\n".join(lines)

    # Minimal PDF generation
    stream_content = b"BT\n/F1 10 Tf\n50 750 Td\n12 TL\n"
    for line in content.split("\n"):
        safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_content += f"({safe_line}) '\n".encode("latin-1", errors="replace")
    stream_content += b"ET\n"

    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        f"4 0 obj\n<< /Length {len(stream_content)} >>\nstream\n".encode()
        + stream_content + b"endstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
    ]

    pdf = b"%PDF-1.4\n"
    offsets = []
    for obj in objects:
        offsets.append(len(pdf))
        pdf += obj
    xref_offset = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for offset in offsets:
        pdf += f"{offset:010d} 00000 n \n".encode()
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode()
    pdf += f"startxref\n{xref_offset}\n%%EOF\n".encode()

    return pdf
