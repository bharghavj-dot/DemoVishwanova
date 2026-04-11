"""
Trilens Router — Authentication (PostgreSQL)
==============================================
Endpoints: POST /auth/register, POST /auth/login, POST /auth/demo-login, GET /auth/me
Matches Login.png and Create Account.png pages.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import crud
from backend.models.schemas import (
    AuthResponse,
    DemoLoginRequest,
    LoginRequest,
    RegisterRequest,
    UserPublic,
    UserRole,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

security = HTTPBearer()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_to_public(user) -> UserPublic:
    """Convert ORM User to public response model."""
    return UserPublic(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        created_at=user.created_at.isoformat() + "Z" if user.created_at else "",
        patient_id=user.patient_id,
        avatar_url=user.avatar_url,
    )


# ── Auth Dependency ───────────────────────────────────────────────────────────

async def get_current_user_dep(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    """Extract bearer token from Authorization header and resolve user."""
    token = credentials.credentials
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Return as dict for backward compat with routers
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "password": user.password,
        "role": user.role,
        "patient_id": user.patient_id,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at.isoformat() + "Z" if user.created_at else "",
    }


# ── POST /auth/register ──────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Create a new clinical account.
    Matches: Create Account.png — role selector, full name, email, password fields.
    """
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if crud.get_user_by_email(db, req.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = crud.create_user(
        db,
        full_name=req.full_name,
        email=req.email,
        password=req.password,
        role=req.role.value,
    )

    token = crud.create_token(db, user.id)

    return AuthResponse(
        access_token=token,
        user=_user_to_public(user),
    )


# ── POST /auth/login ─────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Sign in with email and password.
    Matches: Login.png — role selector, medical email, access key fields.
    """
    user = crud.get_user_by_email(db, req.email)
    if not user or user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or access key")

    if user.role != req.role.value:
        raise HTTPException(
            status_code=403,
            detail=f"This account is registered as '{user.role}', not '{req.role.value}'",
        )

    token = crud.create_token(db, user.id)

    return AuthResponse(
        access_token=token,
        user=_user_to_public(user),
    )


# ── POST /auth/demo-login ────────────────────────────────────────────────────

@router.post("/demo-login", response_model=AuthResponse)
async def demo_login(req: DemoLoginRequest, db: Session = Depends(get_db)):
    """
    Quick demo access without credentials.
    Matches: Login.png — "Patient Demo", "Doctor Demo", "Guardian Demo" buttons.
    """
    demo_user = crud.get_demo_user(db, req.role.value)
    if not demo_user:
        raise HTTPException(
            status_code=404,
            detail=f"No demo account found for role '{req.role.value}'",
        )

    token = crud.create_token(db, demo_user.id)

    return AuthResponse(
        access_token=token,
        user=_user_to_public(demo_user),
    )


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
async def get_me(user: dict = Depends(get_current_user_dep)):
    """Get the currently authenticated user's profile."""
    return UserPublic(**{
        k: v for k, v in user.items()
        if k in UserPublic.model_fields
    })
