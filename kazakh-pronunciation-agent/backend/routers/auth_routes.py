"""Auth router — /api/auth/*."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from auth import hash_password, verify_password, create_token, get_current_user
from services.email import send_reset_email

router = APIRouter()

RESET_TOKEN_EXPIRE_HOURS = 1


@router.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        return JSONResponse(status_code=400, content={"detail": "Email already registered"})

    user = User(
        email=req.email,
        name=req.name,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "level": user.level, "is_admin": user.is_admin or False}}


@router.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        return JSONResponse(status_code=401, content={"detail": "Invalid email or password"})

    token = create_token(user.id)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "level": user.level, "is_admin": user.is_admin or False}}


@router.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "level": user.level, "is_admin": user.is_admin or False}


@router.post("/api/auth/forgot-password")
def forgot_password(
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Generate a reset token, save it, and email the reset link.

    Always returns 200 with the same message regardless of whether the email
    exists — this prevents user enumeration attacks.
    """
    user = db.query(User).filter(User.email == req.email).first()

    if user:
        token = secrets.token_urlsafe(48)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
        db.commit()

        # Send email asynchronously so the endpoint responds quickly
        background_tasks.add_task(send_reset_email, user.email, token)

    return {"message": "If this email is registered, a reset link has been sent."}


@router.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Validate the reset token and set the new password."""
    user = db.query(User).filter(User.reset_token == req.token).first()

    if not user:
        return JSONResponse(status_code=400, content={"detail": "Invalid or expired reset token."})

    if not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
        # Token expired — clean it up
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        return JSONResponse(status_code=400, content={"detail": "Reset token has expired. Please request a new one."})

    # All good — update password and clear token
    user.hashed_password = hash_password(req.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}
