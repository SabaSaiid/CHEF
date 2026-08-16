from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, UserProfile, WeightLog, NutritionLog
from app.schemas import AdaptiveTDEEStatusResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/tdee", tags=["tdee_adaptive"])

@router.get("/adaptive/status", response_model=AdaptiveTDEEStatusResponse)
def get_adaptive_tdee_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the data readiness status for Adaptive TDEE calculation (last 14 days).
    """
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=14)
    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = today.strftime("%Y-%m-%d")

    distinct_nutrition_days = (
        db.query(func.count(func.distinct(NutritionLog.date)))
        .filter(
            NutritionLog.user_id == current_user.id,
            NutritionLog.date >= start_date_str,
            NutritionLog.date <= end_date_str
        )
        .scalar() or 0
    )

    distinct_weight_days = (
        db.query(func.count(func.distinct(WeightLog.date)))
        .filter(
            WeightLog.user_id == current_user.id,
            WeightLog.date >= start_date_str,
            WeightLog.date <= end_date_str
        )
        .scalar() or 0
    )

    is_ready = (distinct_nutrition_days >= 7 and distinct_weight_days >= 7)
    days_needed_nutrition = max(0, 7 - distinct_nutrition_days)
    days_needed_weight = max(0, 7 - distinct_weight_days)

    active_profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id,
        UserProfile.is_active == True
    ).first()

    return AdaptiveTDEEStatusResponse(
        nutrition_days_count=distinct_nutrition_days,
        weight_days_count=distinct_weight_days,
        min_required_days=7,
        is_ready=is_ready,
        days_needed_nutrition=days_needed_nutrition,
        days_needed_weight=days_needed_weight,
        adaptive_tdee=active_profile.tdee_maintenance if active_profile else None
    )


@router.post("/adaptive/calculate", response_model=Dict[str, Any])
def calculate_adaptive_tdee(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate Adaptive TDEE based on the last 14 days of nutrition and weight logs.
    Updates the active profile with the new TDEE if enough data exists.
    """
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=14)
    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = today.strftime("%Y-%m-%d")
    
    # 1. Get average calorie intake over the last 14 days
    nutrition_logs = db.query(NutritionLog).filter(
        NutritionLog.user_id == current_user.id,
        NutritionLog.date >= start_date_str,
        NutritionLog.date <= end_date_str
    ).all()
    
    # Group by date to get daily totals
    daily_calories = {}
    for log in nutrition_logs:
        daily_calories[log.date] = daily_calories.get(log.date, 0) + log.calories
        
    if len(daily_calories) < 7:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough nutrition data. Logged {len(daily_calories)}/14 days. Need at least 7 days."
        )
        
    avg_daily_intake = sum(daily_calories.values()) / len(daily_calories)
    
    # 2. Get weight logs over the last 14 days
    weight_logs = db.query(WeightLog).filter(
        WeightLog.user_id == current_user.id,
        WeightLog.date >= start_date_str,
        WeightLog.date <= end_date_str
    ).order_by(WeightLog.date.asc()).all()
    
    if len(weight_logs) < 7:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough weight data. Logged {len(weight_logs)}/14 days. Need at least 7 days."
        )
        
    # Calculate weight delta using a simple start vs end average (first 3 days vs last 3 days)
    first_half = weight_logs[:3]
    second_half = weight_logs[-3:]
    
    avg_start_weight = sum(w.weight_kg for w in first_half) / len(first_half)
    avg_end_weight = sum(w.weight_kg for w in second_half) / len(second_half)
    
    weight_delta_kg = avg_end_weight - avg_start_weight
    
    # Calculate days between the two averages
    start_date_avg = datetime.strptime(first_half[1].date, "%Y-%m-%d") if len(first_half) >= 2 else datetime.strptime(first_half[0].date, "%Y-%m-%d")
    end_date_avg = datetime.strptime(second_half[1].date, "%Y-%m-%d") if len(second_half) >= 2 else datetime.strptime(second_half[0].date, "%Y-%m-%d")
    
    days_between = (end_date_avg - start_date_avg).days
    if days_between < 5:
        days_between = 14 # Fallback to 14 days if data is weirdly clustered
        
    # 3. Energy Delta (1kg of body tissue = 7700 kcal)
    total_energy_delta = weight_delta_kg * 7700
    daily_energy_delta = total_energy_delta / days_between
    
    # 4. Adaptive TDEE
    # If delta is positive (gained weight), they were in a surplus, so TDEE < Intake
    # If delta is negative (lost weight), they were in a deficit, so TDEE > Intake
    adaptive_tdee = avg_daily_intake - daily_energy_delta
    
    adaptive_tdee = int(round(adaptive_tdee))
    
    # 5. Update user and active profile
    active_profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id,
        UserProfile.is_active == True
    ).first()
    
    if active_profile:
        active_profile.tdee_maintenance = adaptive_tdee
        from app.routers.profiles import _calculate_and_save_targets
        _calculate_and_save_targets(active_profile, active_profile)
            
        current_user.target_calories = active_profile.target_calories
        current_user.tdee_maintenance = adaptive_tdee
        
        db.commit()
    
    return {
        "adaptive_tdee": adaptive_tdee,
        "avg_daily_intake": int(round(avg_daily_intake)),
        "weight_delta_kg": round(weight_delta_kg, 2),
        "days_analyzed": days_between,
        "message": "Adaptive TDEE successfully calculated and updated."
    }
