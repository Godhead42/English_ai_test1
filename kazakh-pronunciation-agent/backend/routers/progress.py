"""Progress router — /api/progress/*."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from database import get_db
from models import User, PronunciationResult
from schemas import SaveResultRequest
from auth import get_current_user

router = APIRouter()


@router.post("/api/progress")
def save_progress(req: SaveResultRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = PronunciationResult(
        user_id=user.id,
        phrase=req.phrase,
        level=req.level,
        topic=req.topic,
        overall_score=req.overall_score,
        accuracy=req.accuracy,
        fluency=req.fluency,
        intonation=req.intonation,
        stress=req.stress,
        issue_count=req.issue_count,
    )
    db.add(result)
    db.commit()
    return {"status": "saved"}


@router.get("/api/progress")
def get_progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = (
        db.query(PronunciationResult)
        .filter(PronunciationResult.user_id == user.id)
        .order_by(PronunciationResult.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "results": [
            {
                "id": r.id,
                "phrase": r.phrase,
                "level": r.level,
                "topic": getattr(r, "topic", ""),
                "overall_score": r.overall_score,
                "accuracy": r.accuracy,
                "fluency": r.fluency,
                "intonation": getattr(r, "intonation", 0),
                "stress": getattr(r, "stress", 0),
                "issue_count": r.issue_count,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in results
        ]
    }


@router.get("/api/progress/stats")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(PronunciationResult).filter(PronunciationResult.user_id == user.id)

    total = query.count()
    if total == 0:
        return {
            "total_sessions": 0, "avg_overall": 0, "avg_accuracy": 0,
            "avg_fluency": 0, "avg_intonation": 0,
            "avg_stress": 0, "best_score": 0, "improvement": 0,
        }

    stats = db.query(
        sa_func.avg(PronunciationResult.overall_score),
        sa_func.avg(PronunciationResult.accuracy),
        sa_func.avg(PronunciationResult.fluency),
        sa_func.max(PronunciationResult.overall_score),
        sa_func.avg(PronunciationResult.intonation),
        sa_func.avg(PronunciationResult.stress),
    ).filter(PronunciationResult.user_id == user.id).first()

    first = query.order_by(PronunciationResult.created_at.asc()).first()
    last = query.order_by(PronunciationResult.created_at.desc()).first()
    start_level = first.overall_score if first else 0
    current_level = last.overall_score if last else 0

    return {
        "total_sessions": total,
        "avg_overall": round(stats[0] or 0, 1),
        "avg_accuracy": round(stats[1] or 0, 1),
        "avg_fluency": round(stats[2] or 0, 1),
        "best_score": round(stats[3] or 0, 1),
        "avg_intonation": round(stats[4] or 0, 1),
        "avg_stress": round(stats[5] or 0, 1),
        "start_level": round(start_level, 1),
        "current_level": round(current_level, 1),
        "improvement": round(round(stats[0] or 0, 1) - start_level, 1),
    }
