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
    """Shared helper: aggregate stats per student (with first/last session data)."""
    students = db.query(User).filter(User.is_admin == False).all()
    result = []
    for s in students:
        stats = db.query(
            sa_func.count(PronunciationResult.id),
            sa_func.avg(PronunciationResult.overall_score),
            sa_func.avg(PronunciationResult.accuracy),
            sa_func.avg(PronunciationResult.fluency),
            sa_func.avg(PronunciationResult.intonation),
            sa_func.avg(PronunciationResult.stress),
            sa_func.max(PronunciationResult.overall_score),
        ).filter(PronunciationResult.user_id == s.id).first()

        # First and last sessions
        first = db.query(PronunciationResult).filter(
            PronunciationResult.user_id == s.id
        ).order_by(PronunciationResult.created_at.asc()).first()
        last = db.query(PronunciationResult).filter(
            PronunciationResult.user_id == s.id
        ).order_by(PronunciationResult.created_at.desc()).first()

        def _snap(r):
            if not r:
                return {"overall": 0, "accuracy": 0, "fluency": 0, "intonation": 0, "stress": 0}
            return {
                "overall": round(r.overall_score, 1),
                "accuracy": round(r.accuracy or 0, 1),
                "fluency": round(r.fluency or 0, 1),
                "intonation": round(r.intonation or 0, 1),
                "stress": round(r.stress or 0, 1),
            }

        result.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "level": s.level,
            "total_sessions": stats[0] or 0,
            "avg_score": round(stats[1] or 0, 1),
            "avg_accuracy": round(stats[2] or 0, 1),
            "avg_fluency": round(stats[3] or 0, 1),
            "avg_intonation": round(stats[4] or 0, 1),
            "avg_stress": round(stats[5] or 0, 1),
            "best_score": round(stats[6] or 0, 1),
            "first": _snap(first),
            "last": _snap(last),
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
        "Name", "Email", "Level", "Sessions",
        "Avg Overall", "Avg Accuracy", "Avg Fluency",
        "Avg Intonation", "Avg Stress", "Best Score",
        "First Overall", "First Accuracy", "First Fluency",
        "First Intonation", "First Stress",
        "Last Overall", "Last Accuracy", "Last Fluency",
        "Last Intonation", "Last Stress",
    ])

    for r in rows:
        f = r["first"]
        l = r["last"]
        writer.writerow([
            r["name"], r["email"], r["level"], r["total_sessions"],
            r["avg_score"], r["avg_accuracy"], r["avg_fluency"],
            r["avg_intonation"], r["avg_stress"], r["best_score"],
            f["overall"], f["accuracy"], f["fluency"],
            f["intonation"], f["stress"],
            l["overall"], l["accuracy"], l["fluency"],
            l["intonation"], l["stress"],
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

    # Compute start level (first session) and current level (last session)
    n = len(all_results)
    first = all_results[0] if n >= 1 else None
    last = all_results[-1] if n >= 1 else None

    def _extract_metrics(r):
        if not r:
            return {"overall": 0, "accuracy": 0, "fluency": 0, "intonation": 0, "stress": 0}
        return {
            "overall": round(r.overall_score, 1),
            "accuracy": round(r.accuracy or 0, 1),
            "fluency": round(r.fluency or 0, 1),
            "intonation": round(r.intonation or 0, 1),
            "stress": round(r.stress or 0, 1),
        }

    start_metrics = _extract_metrics(first)
    current_metrics = _extract_metrics(last)

    avg_metrics = {
        "overall": round(sum(r.overall_score for r in all_results) / n, 1) if n else 0,
        "accuracy": round(sum((r.accuracy or 0) for r in all_results) / n, 1) if n else 0,
        "fluency": round(sum((r.fluency or 0) for r in all_results) / n, 1) if n else 0,
        "intonation": round(sum((r.intonation or 0) for r in all_results) / n, 1) if n else 0,
        "stress": round(sum((r.stress or 0) for r in all_results) / n, 1) if n else 0,
    }

    improvement = {k: round(avg_metrics[k] - start_metrics[k], 1) for k in start_metrics}

    sessions = [
        {
            "id": r.id,
            "phrase": r.phrase[:80] + ("…" if len(r.phrase) > 80 else ""),
            "level": r.level,
            "topic": r.topic or "",
            "overall_score": round(r.overall_score, 1),
            "accuracy": round(r.accuracy or 0, 1),
            "fluency": round(r.fluency or 0, 1),
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
            "total_sessions": n,
            "start_level": start_metrics,
            "current_level": current_metrics,
            "improvement": improvement,
        },
        "sessions": sessions,
    }
