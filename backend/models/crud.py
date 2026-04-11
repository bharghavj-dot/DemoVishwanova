"""
Trilens Backend — CRUD Operations
====================================
Database helper functions used by all routers.
Replaces the in-memory dict lookups from storage.py.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.models.db_models import (
    AuthToken,
    Booking,
    DiagnosticSession,
    Doctor,
    FamilyMember,
    Report,
    User,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:8].upper()}"


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


# ══════════════════════════════════════════════════════════════════════════════
# USERS
# ══════════════════════════════════════════════════════════════════════════════

def create_user(
    db: Session,
    full_name: str,
    email: str,
    password: str,
    role: str,
) -> User:
    """Create and persist a new user."""
    user = User(
        id=_gen_id("USR-"),
        full_name=full_name,
        email=email,
        password=password,
        role=role,
        patient_id=_gen_id("TR-") if role == "patient" else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Find a user by email (case-insensitive)."""
    return db.query(User).filter(User.email.ilike(email)).first()


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Find a user by ID."""
    return db.query(User).get(user_id)


# ── Tokens ────────────────────────────────────────────────────────────────────

def create_token(db: Session, user_id: str) -> str:
    """Create and persist a new auth token."""
    token_str = uuid.uuid4().hex
    token = AuthToken(token=token_str, user_id=user_id)
    db.add(token)
    db.commit()
    return token_str


def get_user_by_token(db: Session, token: str) -> Optional[User]:
    """Resolve a bearer token to a User."""
    auth = db.query(AuthToken).get(token)
    if not auth:
        return None
    return db.query(User).get(auth.user_id)


def get_demo_user(db: Session, role: str) -> Optional[User]:
    """Find a demo user by role (password=demo123)."""
    return db.query(User).filter(
        User.role == role,
        User.password == "demo123",
    ).first()


# ══════════════════════════════════════════════════════════════════════════════
# SESSIONS
# ══════════════════════════════════════════════════════════════════════════════

def create_session(db: Session, user_id: str) -> DiagnosticSession:
    """Create a new diagnostic session."""
    session = DiagnosticSession(
        id=_gen_id("SES-"),
        user_id=user_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: str) -> Optional[DiagnosticSession]:
    """Get a session by ID."""
    return db.query(DiagnosticSession).get(session_id)


def get_active_session(db: Session, user_id: str) -> Optional[DiagnosticSession]:
    """Find an active (non-finalized) session for the user."""
    return db.query(DiagnosticSession).filter(
        DiagnosticSession.user_id == user_id,
        ~DiagnosticSession.status.in_(["finalized", "qa_completed"]),
    ).first()


def update_session(db: Session, session: DiagnosticSession, **kwargs) -> DiagnosticSession:
    """Update session fields. For JSON columns, pass the full updated dict/list."""
    for key, value in kwargs.items():
        setattr(session, key, value)
    db.commit()
    db.refresh(session)
    return session


# ══════════════════════════════════════════════════════════════════════════════
# REPORTS
# ══════════════════════════════════════════════════════════════════════════════

def create_report(
    db: Session,
    session_id: str,
    user_id: str,
    primary_disease: str,
    confidence: float,
    severity: str,
    top3: list,
    precautions: list,
) -> Report:
    """Create an initial diagnostic report."""
    report = Report(
        id=_gen_id("RPT-"),
        session_id=session_id,
        user_id=user_id,
        primary_disease=primary_disease,
        confidence=confidence,
        severity=severity,
        top3=top3,
        precautions=precautions,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_report_by_session(db: Session, session_id: str) -> Optional[Report]:
    """Get report by session ID."""
    return db.query(Report).filter(Report.session_id == session_id).first()


def get_user_reports(db: Session, user_id: str) -> list[Report]:
    """Get all reports for a user, newest first."""
    return db.query(Report).filter(
        Report.user_id == user_id,
    ).order_by(Report.created_at.desc()).all()


def finalize_report(
    db: Session,
    report: Report,
    final_data: dict,
    primary_disease: str,
    confidence: float,
    severity: str,
) -> Report:
    """Mark a report as finalized after Q&A completion."""
    report.is_final = True
    report.final_data = final_data
    report.finalized_at = datetime.utcnow()
    report.primary_disease = primary_disease
    report.confidence = confidence
    report.severity = severity
    db.commit()
    db.refresh(report)
    return report


# ══════════════════════════════════════════════════════════════════════════════
# DOCTORS
# ══════════════════════════════════════════════════════════════════════════════

def get_all_doctors(db: Session) -> list[Doctor]:
    """Get all doctors."""
    return db.query(Doctor).all()


def get_doctor_by_id(db: Session, doctor_id: str) -> Optional[Doctor]:
    """Get a doctor by ID."""
    return db.query(Doctor).get(doctor_id)


def filter_doctors_by_category(db: Session, category: str) -> list[Doctor]:
    """Filter doctors by specialty category."""
    if category == "All":
        return get_all_doctors(db)

    keyword_map = {
        "Ocular": ["Ocular", "Corneal", "Anterior Segment", "Ophthalmolog", "Retinal"],
        "Oral (Tongue)": ["Oral Health", "Tongue", "Dermal"],
        "Nail Health": ["Nail", "Dermal"],
    }
    keywords = keyword_map.get(category, [])
    if not keywords:
        return get_all_doctors(db)

    # Filter using ILIKE on specialty and specialties JSON
    all_docs = db.query(Doctor).all()
    filtered = []
    for doc in all_docs:
        match = False
        for kw in keywords:
            if kw.lower() in (doc.specialty or "").lower():
                match = True
                break
            for s in (doc.specialties or []):
                if kw.lower() in s.lower():
                    match = True
                    break
            if match:
                break
        if match:
            filtered.append(doc)
    return filtered


# ══════════════════════════════════════════════════════════════════════════════
# BOOKINGS
# ══════════════════════════════════════════════════════════════════════════════

def create_booking(
    db: Session,
    doctor_id: str,
    patient_id: str,
    patient_name: str,
    session_id: Optional[str],
    scheduled_at: str,
    fee: float,
    notes: Optional[str],
) -> Booking:
    """Create a new consultation booking."""
    booking = Booking(
        id=_gen_id("BKG-"),
        doctor_id=doctor_id,
        patient_id=patient_id,
        patient_name=patient_name,
        session_id=session_id,
        scheduled_at=scheduled_at,
        fee=fee,
        notes=notes,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def get_all_bookings(db: Session) -> list[Booking]:
    """Get all bookings."""
    return db.query(Booking).all()


def get_booking_by_id(db: Session, booking_id: str) -> Optional[Booking]:
    """Get booking by ID."""
    return db.query(Booking).get(booking_id)


def update_booking(db: Session, booking: Booking, **kwargs) -> Booking:
    """Update booking fields."""
    for key, value in kwargs.items():
        setattr(booking, key, value)
    db.commit()
    db.refresh(booking)
    return booking


# ══════════════════════════════════════════════════════════════════════════════
# FAMILY MEMBERS
# ══════════════════════════════════════════════════════════════════════════════

def get_family_members(db: Session, guardian_id: str) -> list[FamilyMember]:
    """Get all family members for a guardian."""
    return db.query(FamilyMember).filter(
        FamilyMember.guardian_id == guardian_id,
    ).all()


def get_family_member(db: Session, member_id: str) -> Optional[FamilyMember]:
    """Get a family member by ID."""
    return db.query(FamilyMember).get(member_id)


def create_family_member(
    db: Session,
    guardian_id: str,
    name: str,
    relationship: str,
    linked_user_id: Optional[str] = None,
) -> FamilyMember:
    """Create a new family member."""
    member = FamilyMember(
        id=_gen_id("FAM-"),
        guardian_id=guardian_id,
        name=name,
        relationship_=relationship,
        linked_user_id=linked_user_id,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member
