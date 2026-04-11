"""
Trilens Backend — Pydantic Schemas
===================================
All request/response models for the FastAPI backend.
Organized by feature area matching the frontend pages.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    GUARDIAN = "guardian"


class ScanType(str, Enum):
    EYE = "eye"
    TONGUE = "tongue"
    NAIL = "nail"


class AnswerType(str, Enum):
    KEY_SYMPTOM = "key_symptom"
    MODERATE_SYMPTOM = "moderate_symptom"
    POSSIBLE_REASON = "possible_reason"
    NOT_RELEVANT = "not_relevant"


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Dr. Julian Vane"])
    email: str = Field(..., examples=["vane.j@trilens-med.com"])
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    role: UserRole = Field(..., examples=["patient"])


class LoginRequest(BaseModel):
    email: str = Field(..., examples=["iris.walker@trilens.med"])
    password: str = Field(..., min_length=6)
    role: UserRole = Field(..., examples=["patient"])


class DemoLoginRequest(BaseModel):
    role: UserRole = Field(..., examples=["patient"])


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class UserPublic(BaseModel):
    id: str
    full_name: str
    email: str
    role: UserRole
    created_at: str
    patient_id: Optional[str] = None
    avatar_url: Optional[str] = None


# Fix forward reference
AuthResponse.model_rebuild()


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DiagnosticModule(BaseModel):
    id: str
    name: str
    description: str
    icon: str


class DashboardResponse(BaseModel):
    greeting: str
    status_message: str
    modules: list[DiagnosticModule]
    recent_reports: list[ReportSummary] = []


class ReportSummary(BaseModel):
    session_id: str
    primary_disease: str
    confidence: float
    severity: str
    created_at: str
    is_final: bool = False


# Fix forward reference
DashboardResponse.model_rebuild()


# ── Scan / Image Analysis ─────────────────────────────────────────────────────

class ScanUploadResponse(BaseModel):
    session_id: str
    scan_type: ScanType
    features: dict[str, float]
    status: str = "extracted"
    capture_quality: Optional[CaptureQuality] = None


class CaptureQuality(BaseModel):
    lighting: str = "OPTIMAL LUX"
    position: str = "CENTERED"
    clarity: str = "CLEAR"


# Fix forward reference
ScanUploadResponse.model_rebuild()


class AnalyzeRequest(BaseModel):
    session_id: str


class AnalyzeResponse(BaseModel):
    session_id: str
    features: dict[str, float]
    top3: list[DiseaseResult]
    priors: dict[str, float]
    status: str = "analyzed"


class DiseaseResult(BaseModel):
    disease: str
    probability: float
    display_name: Optional[str] = None


# Fix forward reference
AnalyzeResponse.model_rebuild()


class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    uploads: dict[str, bool]
    has_report: bool = False
    has_final_report: bool = False
    qa_started: bool = False
    qa_completed: bool = False


# ── Report ────────────────────────────────────────────────────────────────────

class PrecautionItem(BaseModel):
    text: str
    icon: Optional[str] = None


class ReportResponse(BaseModel):
    session_id: str
    primary_disease: str
    primary_display_name: str
    confidence: float
    severity: str
    severity_note: str
    top3: list[DiseaseResult]
    precautions: list[str]
    created_at: str
    last_scanned: str


class FinalReportResponse(BaseModel):
    session_id: str
    report_id: str
    patient_name: str
    generated_at: str
    diagnostic_confidence: float
    primary_disease: str
    primary_display_name: str
    severity: str
    probable_pathologies: list[DiseaseResult]
    mandatory_clinical_action: Optional[str] = None
    medications: list[MedicationItem]
    precautions: list[str]
    escalation_flags: list[str]
    see_doctor_flag: bool
    recommended_specialists: list[DoctorCard] = []


class MedicationItem(BaseModel):
    name: str
    dosage: str
    icon: Optional[str] = None


class ReportHistoryResponse(BaseModel):
    reports: list[ReportSummary]


# ── Q&A ───────────────────────────────────────────────────────────────────────

class AnswerOption(BaseModel):
    text: str


class QuestionItem(BaseModel):
    index: int
    question: str
    primary_disease: str
    answers: dict[str, AnswerOption]
    why_asking: Optional[str] = None
    clinical_insight: Optional[str] = None


class QAStartResponse(BaseModel):
    session_id: str
    total_questions: int
    questions: list[QuestionItem]


class QAAnswerRequest(BaseModel):
    question_index: int
    answer_type: AnswerType


class QAAnswerResponse(BaseModel):
    session_id: str
    question_index: int
    current_step: int
    total_steps: int
    updated_probabilities: dict[str, float]
    is_complete: bool = False
    ruled_out: list[str] = []


class QAStatusResponse(BaseModel):
    session_id: str
    current_step: int
    total_steps: int
    is_complete: bool
    answered_indices: list[int]
    probabilities: dict[str, float]


# ── Doctors / Consultation ────────────────────────────────────────────────────

class DoctorCard(BaseModel):
    id: str
    name: str
    specialty: str
    specialties: list[str] = []
    verified: bool = True
    rating: float
    review_count: int
    fee: float
    availability: str
    distance: Optional[str] = None
    avatar_url: Optional[str] = None


class DoctorListResponse(BaseModel):
    doctors: list[DoctorCard]
    categories: list[str]


class BookingRequest(BaseModel):
    doctor_id: str
    session_id: Optional[str] = None
    notes: Optional[str] = None


class BookingResponse(BaseModel):
    booking_id: str
    doctor_id: str
    doctor_name: str
    patient_id: str
    status: str = "confirmed"
    scheduled_at: str
    fee: float


# ── Family Dashboard ──────────────────────────────────────────────────────────

class FamilyMemberCreate(BaseModel):
    name: str
    relationship: str = Field(..., examples=["Spouse", "Son", "Father"])
    email: Optional[str] = None


class FamilyMemberResponse(BaseModel):
    id: str
    name: str
    relationship: str
    status: str = "STABLE"
    avatar_url: Optional[str] = None
    has_new_report: bool = False
    reports: list[ReportSummary] = []


class FamilyDashboardResponse(BaseModel):
    members: list[FamilyMemberResponse]


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileResponse(BaseModel):
    id: str
    patient_id: str
    full_name: str
    email: str
    role: UserRole
    clinical_stability: str = "High"
    member_since: str
    avatar_url: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class ClinicalRecord(BaseModel):
    session_id: str
    report_id: str
    primary_disease: str
    confidence: float
    severity: str
    created_at: str


class ClinicalRecordsResponse(BaseModel):
    records: list[ClinicalRecord]


# ── Doctor Dashboard ──────────────────────────────────────────────────────────

class DoctorStatsResponse(BaseModel):
    total_patients: int
    pending_reviews: int
    emergency_escalations: int


class PatientBooking(BaseModel):
    booking_id: str
    patient_name: str
    patient_id: str
    symptom_cluster: str
    scan_type: str
    criteria_status: str
    avatar_url: Optional[str] = None
    session_id: Optional[str] = None


class DoctorDashboardResponse(BaseModel):
    stats: DoctorStatsResponse
    bookings: list[PatientBooking]


class BookingActionRequest(BaseModel):
    action: str = Field(..., examples=["confirm", "review"])


# ── Generic ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    uptime: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str


# Forward reference rebuild for models that reference DoctorCard
FinalReportResponse.model_rebuild()
