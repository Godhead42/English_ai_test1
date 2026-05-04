"""Admin analytics router — /api/admin/* (protected, admin-only)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from database import get_db
from models import User, PronunciationResult
from auth import get_current_admin_user

router = APIRouter()


@router.get("/api/admin/stats/overview")
def admin_overview(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Return high-level KPIs for the admin dashboard."""
    total_students = db.query(sa_func.count(User.id)).filter(User.is_admin == False).scalar() or 0
    total_sessions = db.query(sa_func.count(PronunciationResult.id)).scalar() or 0

    avg_row = db.query(
        sa_func.avg(PronunciationResult.overall_score),
        sa_func.avg(PronunciationResult.fluency),
        sa_func.avg(PronunciationResult.accuracy),
        sa_func.avg(PronunciationResult.completeness),
        sa_func.avg(PronunciationResult.intonation),
        sa_func.avg(PronunciationResult.stress),
    ).first()

    return {
        "total_students": total_students,
        "total_sessions": total_sessions,
        "avg_overall": round(avg_row[0] or 0, 1),
        "avg_fluency": round(avg_row[1] or 0, 1),
        "avg_accuracy": round(avg_row[2] or 0, 1),
        "avg_completeness": round(avg_row[3] or 0, 1),
        "avg_intonation": round(avg_row[4] or 0, 1),
        "avg_stress": round(avg_row[5] or 0, 1),
    }


@router.get("/api/admin/stats/recent-activity")
def admin_recent_activity(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    limit: int = 20,
):
    """Return the most recent pronunciation attempts across all students."""
    rows = (
        db.query(PronunciationResult, User.name, User.email)
        .join(User, PronunciationResult.user_id == User.id)
        .order_by(PronunciationResult.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "activities": [
            {
                "id": r.id,
                "student_name": name,
                "student_email": email,
                "phrase": r.phrase[:80] + ("…" if len(r.phrase) > 80 else ""),
                "level": r.level,
                "topic": r.topic or "",
                "overall_score": round(r.overall_score, 1),
                "accuracy": round(r.accuracy or 0, 1),
                "fluency": round(r.fluency or 0, 1),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r, name, email in rows
        ]
    }


@router.get("/api/admin/stats/students")
def admin_students(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Return per-student aggregate stats."""
    students = db.query(User).filter(User.is_admin == False).all()
    result = []
    for s in students:
        stats = db.query(
            sa_func.count(PronunciationResult.id),
            sa_func.avg(PronunciationResult.overall_score),
            sa_func.avg(PronunciationResult.fluency),
            sa_func.max(PronunciationResult.overall_score),
        ).filter(PronunciationResult.user_id == s.id).first()

        result.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "level": s.level,
            "total_sessions": stats[0] or 0,
            "avg_score": round(stats[1] or 0, 1),
            "avg_fluency": round(stats[2] or 0, 1),
            "best_score": round(stats[3] or 0, 1),
            "joined": s.created_at.isoformat() if s.created_at else None,
        })

    return {"students": result}
