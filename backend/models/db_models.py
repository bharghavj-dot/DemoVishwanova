"""
Trilens Backend — SQLAlchemy ORM Models
=========================================
6 tables mapping to all entities in the diagnostic pipeline.

Tables:
    users           — Patient / Doctor / Guardian accounts
    sessions        — Diagnostic scan sessions (carries state across the pipeline)
    reports         — Initial + final diagnostic reports
    bookings        — Doctor consultation bookings
    doctors         — Available doctors / specialists
    family_members  — Guardian → family member relationships
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship

from backend.database import Base


# ── Helpers ───────────────────────────────────────────────────────────────────

def _gen_uuid(prefix: str = "") -> str:
    """Generate a short prefixed UUID."""
    return f"{prefix}{uuid.uuid4().hex[:8].upper()}"


# ── Users ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(20), primary_key=True, default=lambda: _gen_uuid("USR-"))
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)  # plain text for MVP; hash in prod
    role = Column(String(20), nullable=False)  # patient, doctor, guardian
    patient_id = Column(String(20), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sessions = relationship("DiagnosticSession", back_populates="user", lazy="dynamic")
    reports = relationship("Report", back_populates="user", lazy="dynamic")
    bookings = relationship(
        "Booking",
        back_populates="patient",
        foreign_keys="Booking.patient_id",
        lazy="dynamic",
    )
    family_members = relationship("FamilyMember", back_populates="guardian", lazy="dynamic")


# ── Diagnostic Sessions ──────────────────────────────────────────────────────

class DiagnosticSession(Base):
    __tablename__ = "sessions"

    id = Column(String(20), primary_key=True, default=lambda: _gen_uuid("SES-"))
    user_id = Column(String(20), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="pending")
    # pending → uploading → analyzing → analyzed → qa_started → qa_completed → finalized

    # JSON columns for complex nested data
    uploads = Column(JSON, default=lambda: {"eye": False, "tongue": False, "nail": False})
    features = Column(JSON, default=dict)           # {eye: {...}, tongue: {...}, nail: {...}}
    merged_features = Column(JSON, default=dict)    # all 15 features merged
    top3 = Column(JSON, default=list)               # [{disease, probability}, ...]
    priors = Column(JSON, default=dict)             # {disease: prob}
    top3_tuples = Column(JSON, default=list)        # [(disease, prob), ...]
    questions = Column(JSON, default=list)           # LLM-generated questions
    answers = Column(JSON, default=dict)             # {question_index: answer_type}
    qa_probabilities = Column(JSON, default=dict)   # updated Bayesian posteriors
    final_output = Column(JSON, nullable=True)       # format_output() result

    # Relationships
    user = relationship("User", back_populates="sessions")
    report = relationship("Report", back_populates="session", uselist=False)


# ── Reports ───────────────────────────────────────────────────────────────────

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(20), primary_key=True, default=lambda: _gen_uuid("RPT-"))
    session_id = Column(String(20), ForeignKey("sessions.id"), unique=True, nullable=False, index=True)
    user_id = Column(String(20), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    finalized_at = Column(DateTime, nullable=True)

    primary_disease = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    severity = Column(String(30), nullable=False)
    top3 = Column(JSON, default=list)            # [{disease, probability, display_name}, ...]
    precautions = Column(JSON, default=list)     # [str, ...]
    is_final = Column(Boolean, default=False)
    final_data = Column(JSON, nullable=True)      # full format_output() dict

    # Relationships
    user = relationship("User", back_populates="reports")
    session = relationship("DiagnosticSession", back_populates="report")


# ── Bookings ──────────────────────────────────────────────────────────────────

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(20), primary_key=True, default=lambda: _gen_uuid("BKG-"))
    doctor_id = Column(String(20), ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(String(20), ForeignKey("users.id"), nullable=False, index=True)
    patient_name = Column(String(100), nullable=True)
    session_id = Column(String(20), nullable=True)
    status = Column(String(20), default="confirmed")
    scheduled_at = Column(String(100), nullable=True)
    fee = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Doctor dashboard fields
    symptom_cluster = Column(String(100), default="Visual Biomarker Scan")
    scan_type = Column(String(50), default="MULTI-MODAL")
    criteria_status = Column(String(50), default="Criteria Met")

    # Relationships
    patient = relationship("User", back_populates="bookings", foreign_keys=[patient_id])
    doctor = relationship("Doctor", back_populates="bookings")


# ── Doctors ───────────────────────────────────────────────────────────────────

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(20), primary_key=True, default=lambda: _gen_uuid("DOC-"))
    name = Column(String(100), nullable=False)
    specialty = Column(String(100), nullable=False)
    specialties = Column(JSON, default=list)    # [str, ...]
    verified = Column(Boolean, default=True)
    rating = Column(Float, default=5.0)
    review_count = Column(Integer, default=0)
    fee = Column(Float, default=100.0)
    availability = Column(String(100), nullable=True)
    distance = Column(String(50), nullable=True)
    avatar_url = Column(Text, nullable=True)

    # Relationships
    bookings = relationship("Booking", back_populates="doctor", lazy="dynamic")


# ── Family Members ────────────────────────────────────────────────────────────

class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(String(20), primary_key=True, default=lambda: _gen_uuid("FAM-"))
    guardian_id = Column(String(20), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    relationship_ = Column("relationship", String(50), nullable=False)
    status = Column(String(30), default="STABLE")
    avatar_url = Column(Text, nullable=True)
    linked_user_id = Column(String(20), nullable=True)
    has_new_report = Column(Boolean, default=False)

    # Relationships
    guardian = relationship("User", back_populates="family_members")


# ── Token storage (lightweight — kept in DB for persistence) ──────────────────

class AuthToken(Base):
    __tablename__ = "auth_tokens"

    token = Column(String(64), primary_key=True)
    user_id = Column(String(20), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
