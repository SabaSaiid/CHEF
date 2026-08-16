from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, WeightLog
from app.schemas import WeightLogCreate, WeightLogResponse, WeightSummaryResponse
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
    limit: int = 60,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent weight logs for the current user."""
    logs = db.query(WeightLog).filter(WeightLog.user_id == current_user.id)\
        .order_by(WeightLog.date.desc()).limit(limit).all()
    return logs

@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific weight log by ID."""
    log = db.query(WeightLog).filter(
        WeightLog.id == log_id,
        WeightLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Weight log not found.")
    db.delete(log)
    db.commit()

@router.get("/summary", response_model=WeightSummaryResponse)
def get_weight_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get calculated summary metrics of the user's weight journey."""
    logs = db.query(WeightLog).filter(WeightLog.user_id == current_user.id)\
        .order_by(WeightLog.date.desc()).all()
    
    if not logs:
        return WeightSummaryResponse(total_logs=0)
    
    weights = [l.weight_kg for l in logs]
    current_weight = weights[0]
    lowest_weight = min(weights)
    highest_weight = max(weights)
    latest_date = logs[0].date
    
    last_7_logs = logs[:7]
    avg_7day = round(sum(l.weight_kg for l in last_7_logs) / len(last_7_logs), 2) if last_7_logs else None
    
    delta_30day = None
    if len(logs) > 1:
        oldest_or_30d = logs[min(len(logs) - 1, 29)]
        delta_30day = round(current_weight - oldest_or_30d.weight_kg, 2)
    
    return WeightSummaryResponse(
        total_logs=len(logs),
        current_weight=round(current_weight, 2),
        lowest_weight=round(lowest_weight, 2),
        highest_weight=round(highest_weight, 2),
        avg_7day=avg_7day,
        delta_30day=delta_30day,
        latest_date=latest_date
    )
