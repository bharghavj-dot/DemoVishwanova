"""
Trilens Backend — Database Seed Script
========================================
Populates the database with demo data (users, doctors, family members).

Usage:
    .venv\\Scripts\\python -m backend.seed
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on path
_ROOT = str(Path(__file__).resolve().parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from backend.database import Base, SessionLocal, engine
from backend.models.db_models import Doctor, FamilyMember, User


def seed():
    """Create tables and insert seed data."""
    print("[seed] Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("[seed] Tables created successfully.")

    db = SessionLocal()

    try:
        # ── Check if already seeded ───────────────────────────────────────
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"[seed] Database already has {existing_users} users. Skipping seed.")
            return

        # ── Demo Users ────────────────────────────────────────────────────
        print("[seed] Inserting demo users...")

        patient = User(
            id="USR-PATIENT1",
            full_name="Alex Morgan",
            email="alex@trilens.med",
            password="demo123",
            role="patient",
            patient_id="TR-9920-X12",
        )

        doctor = User(
            id="USR-DOCTOR1",
            full_name="Dr. Clinical",
            email="dr.clinical@trilens.med",
            password="demo123",
            role="doctor",
        )

        guardian = User(
            id="USR-GUARD1",
            full_name="Elena Rodriguez",
            email="elena@trilens.med",
            password="demo123",
            role="guardian",
            patient_id="TR-9920-X12",
        )

        db.add_all([patient, doctor, guardian])
        db.flush()
        print(f"  Added 3 demo users")

        # ── Doctors ───────────────────────────────────────────────────────
        print("[seed] Inserting doctors...")

        doctors_data = [
            {
                "id": "DOC-001",
                "name": "Dr. Aris Thorne",
                "specialty": "Ocular Surface Specialist",
                "specialties": ["Ocular Diagnostics", "Corneal Imaging"],
                "rating": 4.9, "review_count": 128, "fee": 120.00,
                "availability": "Today, 2:00 PM", "distance": "12KM AWAY",
            },
            {
                "id": "DOC-002",
                "name": "Dr. Julian Vance",
                "specialty": "Dermal Biomarker Analyst",
                "specialties": ["Nail Bed Analysis", "Oral Health"],
                "rating": 5.0, "review_count": 84, "fee": 150.00,
                "availability": "Tomorrow, 9:00 AM", "distance": "4KM AWAY",
            },
            {
                "id": "DOC-003",
                "name": "Dr. Sarah Jenkins",
                "specialty": "Ophthalmologist",
                "specialties": ["Ocular Diagnostics", "Retinal Imaging"],
                "rating": 4.9, "review_count": 128, "fee": 120.00,
                "availability": "Today, 4:00 PM", "distance": "12KM AWAY",
            },
            {
                "id": "DOC-004",
                "name": "Dr. Michael Chen",
                "specialty": "Corneal Specialist",
                "specialties": ["Corneal Imaging", "Anterior Segment"],
                "rating": 5.0, "review_count": 84, "fee": 150.00,
                "availability": "Tomorrow, 10:00 AM", "distance": "4KM AWAY",
            },
            {
                "id": "DOC-005",
                "name": "Dr. Elena Rodriguez",
                "specialty": "Anterior Segment Specialist",
                "specialties": ["Anterior Segment", "Ocular Diagnostics"],
                "rating": 4.8, "review_count": 210, "fee": 95.00,
                "availability": "Today, 5:30 PM", "distance": "9KM AWAY",
            },
            {
                "id": "DOC-006",
                "name": "Dr. Priya Mehta",
                "specialty": "General Practitioner",
                "specialties": ["General Medicine", "Preventive Care"],
                "rating": 4.7, "review_count": 195, "fee": 80.00,
                "availability": "Today, 3:00 PM", "distance": "6KM AWAY",
            },
            {
                "id": "DOC-007",
                "name": "Dr. Raj Patel",
                "specialty": "General Practitioner",
                "specialties": ["General Medicine", "Diagnostics"],
                "rating": 4.6, "review_count": 152, "fee": 75.00,
                "availability": "Tomorrow, 11:00 AM", "distance": "8KM AWAY",
            },
        ]

        doctor_users = []
        for d in doctors_data:
            email_prefix = d["name"].lower().replace(" ", ".").replace("dr.", "dr")
            doctor_users.append(User(
                id=f"USR-{d['id']}",
                full_name=d["name"],
                email=f"{email_prefix}@trilens.med",
                password="demo123",
                role="doctor",
            ))
        db.add_all(doctor_users)

        for d in doctors_data:
            db.add(Doctor(**d))
        db.flush()
        print(f"  Added {len(doctors_data)} doctors and their user accounts")

        # ── Family Members (for guardian) ─────────────────────────────────
        print("[seed] Inserting family members...")

        family_members = [
            FamilyMember(
                id="FAM-SARAH01",
                guardian_id="USR-GUARD1",
                name="Sarah",
                relationship_="Spouse",
                status="STABLE",
            ),
            FamilyMember(
                id="FAM-LEO001",
                guardian_id="USR-GUARD1",
                name="Leo",
                relationship_="Son",
                status="NEW REPORT AVAILABLE",
                has_new_report=True,
            ),
            FamilyMember(
                id="FAM-ARTHR1",
                guardian_id="USR-GUARD1",
                name="Arthur",
                relationship_="Father",
                status="CHECKUP PENDING",
            ),
        ]

        db.add_all(family_members)
        db.flush()
        print(f"  Added {len(family_members)} family members")

        # ── Commit ────────────────────────────────────────────────────────
        db.commit()
        print("\n[seed] Database seeded successfully!")
        print(f"  Users:          3")
        print(f"  Doctors:        {len(doctors_data)}")
        print(f"  Family members: {len(family_members)}")

    except Exception as e:
        db.rollback()
        print(f"[seed] ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
