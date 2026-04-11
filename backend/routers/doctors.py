"""
Trilens Router — Doctors / Consultation (PostgreSQL)
======================================================
Endpoints: GET /doctors, GET /doctors/{doctor_id}, POST /doctors/book
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import crud
from backend.models.schemas import (
    BookingRequest,
    BookingResponse,
    DoctorCard,
    DoctorListResponse,
)
from backend.routers.auth import get_current_user_dep

router = APIRouter(prefix="/doctors", tags=["Doctors & Consultation"])


@router.get("", response_model=DoctorListResponse)
async def list_doctors(
    category: str = Query(default="All"),
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """List available doctors."""
    categories = ["All", "Ocular", "Oral (Tongue)", "Nail Health"]
    filtered = crud.filter_doctors_by_category(db, category)

    doctor_cards = [
        DoctorCard(
            id=doc.id,
            name=doc.name,
            specialty=doc.specialty,
            specialties=doc.specialties or [],
            verified=doc.verified,
            rating=doc.rating,
            review_count=doc.review_count,
            fee=doc.fee,
            availability=doc.availability or "",
            distance=doc.distance,
            avatar_url=doc.avatar_url,
        )
        for doc in filtered
    ]

    return DoctorListResponse(doctors=doctor_cards, categories=categories)


@router.get("/{doctor_id}", response_model=DoctorCard)
async def get_doctor(
    doctor_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get detailed profile for a specific doctor."""
    doc = crud.get_doctor_by_id(db, doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return DoctorCard(
        id=doc.id, name=doc.name, specialty=doc.specialty,
        specialties=doc.specialties or [], verified=doc.verified,
        rating=doc.rating, review_count=doc.review_count, fee=doc.fee,
        availability=doc.availability or "", distance=doc.distance,
        avatar_url=doc.avatar_url,
    )


@router.post("/book", response_model=BookingResponse, status_code=201)
async def book_consultation(
    req: BookingRequest,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Book a consultation with a doctor."""
    doc = crud.get_doctor_by_id(db, req.doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    booking = crud.create_booking(
        db,
        doctor_id=doc.id,
        patient_id=user["id"],
        patient_name=user["full_name"],
        session_id=req.session_id,
        scheduled_at=doc.availability or "",
        fee=doc.fee,
        notes=req.notes,
    )

    return BookingResponse(
        booking_id=booking.id,
        doctor_id=doc.id,
        doctor_name=doc.name,
        patient_id=user["id"],
        status=booking.status,
        scheduled_at=booking.scheduled_at or "",
        fee=booking.fee or 0.0,
    )
