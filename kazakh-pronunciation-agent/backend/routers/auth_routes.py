"""Auth router — /api/auth/*."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import RegisterRequest, LoginRequest
from auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter()


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
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "level": user.level}}


@router.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        return JSONResponse(status_code=401, content={"detail": "Invalid email or password"})

    token = create_token(user.id)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "level": user.level}}


@router.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "level": user.level}
