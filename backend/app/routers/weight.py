from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, WeightLog
from app.schemas import WeightLogCreate, WeightLogResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/weight", tags=["weight"])

@router.post("/log", response_model=WeightLogResponse)
def log_weight(
    req: WeightLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log a daily weight for the user. If an entry exists for the date, it is updated."""
    log_date = req.date if req.date else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if a log for this date already exists
    existing_log = db.query(WeightLog).filter(
        WeightLog.user_id == current_user.id,
        WeightLog.date == log_date
    ).first()

    if existing_log:
        existing_log.weight_kg = req.weight_kg
        existing_log.logged_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing_log)
        return existing_log
    
    # Create new
    new_log = WeightLog(
        user_id=current_user.id,
        weight_kg=req.weight_kg,
        date=log_date
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    return new_log

@router.get("/logs", response_model=List[WeightLogResponse])
def get_weight_logs(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent weight logs for the current user."""
    logs = db.query(WeightLog).filter(WeightLog.user_id == current_user.id)\
        .order_by(WeightLog.date.desc()).limit(limit).all()
    return logs
