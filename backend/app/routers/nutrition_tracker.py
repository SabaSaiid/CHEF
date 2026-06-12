"""
Nutrition tracker router — log daily food intake and view summaries.
Requires authentication for all endpoints.
"""

from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import NutritionLog, User
from app.auth import get_current_user
from app.schemas import (
    NutritionLogCreate,
    NutritionLogResponse,
    DailyNutritionSummary,
)

router = APIRouter(prefix="/api/nutrition/log", tags=["nutrition-tracker"])


@router.post("", response_model=NutritionLogResponse, status_code=201)
def log_food(
    req: NutritionLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a food item to the daily nutrition tracker. Requires authentication."""
    log = NutritionLog(
        user_id=current_user.id,
        food_item=req.food_item,
        calories=req.calories,
        protein_g=req.protein_g,
        carbs_g=req.carbs_g,
        fat_g=req.fat_g,
        fiber_g=req.fiber_g,
        quantity=req.quantity,
        unit=req.unit,
        meal_slot=req.meal_slot,
        date=req.date or date.today().isoformat(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("", response_model=list[NutritionLogResponse])
def get_daily_log(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all logged food items for a specific date. Requires authentication."""
    logs = db.query(NutritionLog).filter(
        NutritionLog.user_id == current_user.id,
        NutritionLog.date == date,
    ).order_by(NutritionLog.logged_at.desc()).all()
    return logs


@router.delete("/{log_id}", status_code=200)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a food log entry. Only the owner can delete. Requires authentication."""
    log = db.query(NutritionLog).filter(
        NutritionLog.id == log_id,
        NutritionLog.user_id == current_user.id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    db.delete(log)
    db.commit()
    return {"message": "Log entry deleted", "id": log_id}


@router.get("/summary", response_model=list[DailyNutritionSummary])
def get_summary(
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated daily nutrition totals over a date range (max 90 days).
    Returns one summary per day with total calories, protein, carbs, fat, and fiber.
    """
    # Validate date range
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")
    if end < start:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    if (end - start).days > 90:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 90 days")

    rows = db.query(
        NutritionLog.date,
        func.sum(NutritionLog.calories).label("total_calories"),
        func.sum(NutritionLog.protein_g).label("total_protein_g"),
        func.sum(NutritionLog.carbs_g).label("total_carbs_g"),
        func.sum(NutritionLog.fat_g).label("total_fat_g"),
        func.sum(NutritionLog.fiber_g).label("total_fiber_g"),
        func.count(NutritionLog.id).label("items_logged"),
    ).filter(
        NutritionLog.user_id == current_user.id,
        NutritionLog.date >= start_date,
        NutritionLog.date <= end_date,
    ).group_by(NutritionLog.date).order_by(NutritionLog.date).all()

    return [
        DailyNutritionSummary(
            date=row.date,
            total_calories=round(row.total_calories or 0, 1),
            total_protein_g=round(row.total_protein_g or 0, 1),
            total_carbs_g=round(row.total_carbs_g or 0, 1),
            total_fat_g=round(row.total_fat_g or 0, 1),
            total_fiber_g=round(row.total_fiber_g or 0, 1),
            items_logged=row.items_logged,
        )
        for row in rows
    ]
