"""Admin analytics router — /api/admin/* (protected, admin-only)."""

import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import Response
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


def _get_student_rows(db: Session) -> list[dict]:
    """Shared helper: aggregate stats per student."""
    students = db.query(User).filter(User.is_admin == False).all()
    result = []
    for s in students:
        stats = db.query(
            sa_func.count(PronunciationResult.id),
            sa_func.avg(PronunciationResult.overall_score),
            sa_func.avg(PronunciationResult.accuracy),
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
            "avg_accuracy": round(stats[2] or 0, 1),
            "avg_fluency": round(stats[3] or 0, 1),
            "best_score": round(stats[4] or 0, 1),
            "joined": s.created_at.isoformat() if s.created_at else None,
        })
    return result


@router.get("/api/admin/stats/students")
def admin_students(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Return per-student aggregate stats."""
    return {"students": _get_student_rows(db)}


@router.get("/api/admin/export/csv")
def export_csv(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Generate a CSV report of student progress (Excel-friendly with UTF-8 BOM)."""
    rows = _get_student_rows(db)

    output = io.StringIO()
    # UTF-8 BOM so Excel opens Cyrillic correctly
    output.write("\ufeff")

    writer = csv.writer(output)
    writer.writerow([
        "Name",
        "Email",
        "Level",
        "Sessions",
        "Avg Overall",
        "Avg Accuracy",
        "Avg Fluency",
        "Best Score",
    ])

    for r in rows:
        writer.writerow([
            r["name"],
            r["email"],
            r["level"],
            r["total_sessions"],
            r["avg_score"],
            r["avg_accuracy"],
            r["avg_fluency"],
            r["best_score"],
        ])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=students_progress.csv",
        },
    )


@router.get("/api/admin/student/{student_id}/history")
def student_history(
    student_id: int,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Return full session history and progress stats for a specific student."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        return {"error": "Student not found"}

    all_results = (
        db.query(PronunciationResult)
        .filter(PronunciationResult.user_id == student_id)
        .order_by(PronunciationResult.created_at.asc())
        .all()
    )

    # Compute start level (avg of first 3) and current level (avg of last 3)
    scores = [r.overall_score for r in all_results]
    start_level = round(sum(scores[:3]) / len(scores[:3]), 1) if len(scores) >= 1 else 0
    current_level = round(sum(scores[-3:]) / len(scores[-3:]), 1) if len(scores) >= 1 else 0

    sessions = [
        {
            "id": r.id,
            "phrase": r.phrase[:80] + ("…" if len(r.phrase) > 80 else ""),
            "level": r.level,
            "topic": r.topic or "",
            "overall_score": round(r.overall_score, 1),
            "accuracy": round(r.accuracy or 0, 1),
            "fluency": round(r.fluency or 0, 1),
            "completeness": round(r.completeness or 0, 1),
            "intonation": round(r.intonation or 0, 1),
            "stress": round(r.stress or 0, 1),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in all_results
    ]

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "level": student.level,
        },
        "stats": {
            "total_sessions": len(all_results),
            "start_level": start_level,
            "current_level": current_level,
            "improvement": round(current_level - start_level, 1),
        },
        "sessions": sessions,
    }
