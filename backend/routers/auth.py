"""
Trilens Router — Authentication (PostgreSQL)
==============================================
Endpoints: POST /auth/register, POST /auth/login, POST /auth/demo-login, GET /auth/me,
           POST /auth/forgot-password, POST /auth/reset-password
Matches Login.png and Create Account.png pages.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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

    # Automatically link any family member profiles waiting for this email
    crud.link_pending_family_members(db, user)

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


# ── POST /auth/forgot-password ────────────────────────────────────────────

def _send_reset_email_task(user_email: str, full_name: str, reset_url: str):
    """Background task to handle the blocking SMTP connection"""
    import os
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    smtp_email = os.environ.get("SMTP_EMAIL", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")

    if smtp_email and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Reset Your Trilens Password"
            msg["From"] = f"Trilens <{smtp_email}>"
            msg["To"] = user_email

            html_body = f"""
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #f8fafa;">
              <div style="background: white; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e8eded;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #1B4D4B, #00D4AA); border-radius: 14px; line-height: 56px; color: white; font-size: 24px; font-weight: bold;">T</div>
                </div>
                <h1 style="color: #1A2C2C; font-size: 22px; font-weight: 700; text-align: center; margin: 0 0 8px;">Reset Your Password</h1>
                <p style="color: #6B8A8A; font-size: 14px; text-align: center; margin: 0 0 32px; line-height: 1.6;">
                  Hi <strong>{full_name}</strong>, we received a request to reset your access key. Click the button below to set a new password.
                </p>
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #1B4D4B, #00D4AA); color: white; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.5px;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #9BB0B0; font-size: 12px; text-align: center; margin: 0 0 16px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e8eded; margin: 24px 0;" />
                <p style="color: #b0c4c4; font-size: 11px; text-align: center; margin: 0;">Trilens — Precision Clinical Diagnostics</p>
              </div>
            </div>
            """

            text_body = f"Hi {full_name},\n\nReset your password here: {reset_url}\n\nThis link expires in 1 hour.\n\n— Trilens"

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            # Switch from port 465 (SSL) to 587 (STARTTLS)
            # This often bypasses 'Network is unreachable' on free cloud tiers and IPv6 routing errors
            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.ehlo()
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, user_email, msg.as_string())

            print(f"[auth] Password reset email sent to {user_email}")

        except Exception as e:
            print(f"[auth] Failed to send email: {e}")
            # Fallback to console
            print(f"[auth] Reset URL: {reset_url}")
    else:
        # No SMTP configured — print to console
        print("\n" + "=" * 60)
        print("PASSWORD RESET LINK (no SMTP configured)")
        print(f"  User: {full_name} ({user_email})")
        print(f"  URL:  {reset_url}")
        print(f"  Token expires in 1 hour.")
        print("=" * 60 + "\n")


@router.post("/forgot-password")
async def forgot_password(req: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Request a password reset link.
    Sends a real email via Gmail SMTP if configured, otherwise prints to console.
    Always returns success to prevent email enumeration.
    """
    import os

    email = req.get("email", "").strip()
    user = crud.get_user_by_email(db, email)

    if user:
        token = crud.create_password_reset_token(db, user.id)
        
        # Use FRONTEND_URL env var if available, otherwise fallback
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip('/')
        reset_url = f"{frontend_url}/reset-password?token={token}"

        # Delegate email sending to background task immediately
        background_tasks.add_task(_send_reset_email_task, user.email, user.full_name, reset_url)

    return {"message": "If an account with that email exists, a password reset link has been sent."}


# ── POST /auth/reset-password ─────────────────────────────────────────────

@router.post("/reset-password")
async def reset_password(req: dict, db: Session = Depends(get_db)):
    """
    Reset a user's password using a valid reset token.
    """
    token = req.get("token", "")
    new_password = req.get("new_password", "")
    confirm_password = req.get("confirm_password", "")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required.")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    user = crud.validate_reset_token(db, token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    crud.update_user_password(db, user.id, new_password)
    crud.mark_reset_token_used(db, token)

    return {"message": "Password has been reset successfully. You can now sign in with your new password."}
