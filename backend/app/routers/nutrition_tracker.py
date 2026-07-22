"""
Nutrition tracker router — log daily food intake and view summaries.
Requires authentication for all endpoints.
"""

from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import NutritionLog, User, WaterLog
from app.auth import get_current_user
from app.schemas import (
    NutritionLogCreate,
    NutritionLogResponse,
    DailyNutritionSummary,
    WaterLogCreate,
    WaterLogUpdate,
    WaterLogResponse,
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


@router.post("/water", response_model=WaterLogResponse, status_code=201)
def log_water(
    req: WaterLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log water intake in ml. Requires authentication."""
    log = WaterLog(
        user_id=current_user.id,
        amount_ml=req.amount_ml,
        date=req.date or date.today().isoformat()
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/water")
def get_daily_water(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the sum and detailed log of water intake for a date. Requires authentication."""
    logs = db.query(WaterLog).filter(
        WaterLog.user_id == current_user.id,
        WaterLog.date == date
    ).order_by(WaterLog.logged_at.desc()).all()
    
    total_ml = sum(log.amount_ml for log in logs)
    return {
        "date": date,
        "total_ml": total_ml,
        "logs": [
            {
                "id": log.id,
                "amount_ml": log.amount_ml,
                "date": log.date,
                "logged_at": log.logged_at.isoformat() if log.logged_at else None
            }
            for log in logs
        ]
    }


@router.put("/water/{log_id}", response_model=WaterLogResponse)
def update_water_log(
    log_id: int,
    req: WaterLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a water log entry amount. Requires authentication."""
    log = db.query(WaterLog).filter(
        WaterLog.id == log_id,
        WaterLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Water log entry not found")
    log.amount_ml = req.amount_ml
    db.commit()
    db.refresh(log)
    return log


@router.delete("/water/{log_id}", status_code=200)
def delete_water_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a water log entry. Requires authentication."""
    log = db.query(WaterLog).filter(
        WaterLog.id == log_id,
        WaterLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Water log entry not found")
    db.delete(log)
    db.commit()
    return {"message": "Water log entry deleted", "id": log_id}


@router.get("/coach-insights")
def get_coach_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze user's nutrition and hydration logs over the past 7 days 
    to provide coaching feedback and identify deficiencies.
    """
    import datetime
    today_dt = datetime.datetime.now(datetime.timezone.utc).date()
    seven_days_ago = today_dt - datetime.timedelta(days=7)
    seven_days_ago_str = seven_days_ago.isoformat()

    # Query last 7 days of logs
    food_logs = db.query(NutritionLog).filter(
        NutritionLog.user_id == current_user.id,
        NutritionLog.date >= seven_days_ago_str
    ).all()

    water_logs = db.query(WaterLog).filter(
        WaterLog.user_id == current_user.id,
        WaterLog.date >= seven_days_ago_str
    ).all()

    # Targets (use user profile targets or reasonable defaults)
    t_cal = current_user.target_calories or 2000
    t_prot = current_user.target_protein or 120
    t_carb = current_user.target_carbs or 230
    t_fat = current_user.target_fat or 65
    t_fib = current_user.target_fiber_g or 25
    t_water = current_user.target_water_ml or 2500

    # Group by date to find daily totals
    daily_food = defaultdict(lambda: {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0})
    for log in food_logs:
        daily_food[log.date]["calories"] += log.calories * log.quantity
        daily_food[log.date]["protein"] += log.protein_g * log.quantity
        daily_food[log.date]["carbs"] += log.carbs_g * log.quantity
        daily_food[log.date]["fat"] += log.fat_g * log.quantity
        daily_food[log.date]["fiber"] += (log.fiber_g or 0.0) * log.quantity

    daily_water = defaultdict(float)
    for log in water_logs:
        daily_water[log.date] += log.amount_ml

    # Calculate averages over active logging days (or min 1 day)
    active_days = max(len(set(list(daily_food.keys()) + list(daily_water.keys()))), 1)

    avg_cal = sum(d["calories"] for d in daily_food.values()) / active_days
    avg_prot = sum(d["protein"] for d in daily_food.values()) / active_days
    avg_carb = sum(d["carbs"] for d in daily_food.values()) / active_days
    avg_fat = sum(d["fat"] for d in daily_food.values()) / active_days
    avg_fib = sum(d["fiber"] for d in daily_food.values()) / active_days
    avg_water = sum(daily_water.values()) / active_days

    insights = []

    # Calorie analysis
    if avg_cal > t_cal + 150:
        insights.append({
            "category": "Calories",
            "status": "warning",
            "message": f"Your average intake ({int(avg_cal)} kcal) is higher than your goal ({t_cal} kcal). Focus on high-volume, low-calorie foods like leafy greens to feel full."
        })
    elif avg_cal < t_cal - 250 and avg_cal > 200:
        insights.append({
            "category": "Calories",
            "status": "info",
            "message": f"Your average calorie intake ({int(avg_cal)} kcal) is lower than your goal ({t_cal} kcal). Ensure you are fueling enough for recovery."
        })
    else:
        insights.append({
            "category": "Calories",
            "status": "success",
            "message": f"Excellent caloric control! Your average intake ({int(avg_cal)} kcal) is right on target."
        })

    # Protein analysis
    if avg_prot < t_prot - 15:
        insights.append({
            "category": "Protein",
            "status": "warning",
            "message": f"Protein intake is low ({int(avg_prot)}g vs target {t_prot}g). Try adding protein-dense foods like chicken breast, eggs, Greek yogurt, or lentils."
        })

    # Fiber analysis
    if avg_fib < t_fib - 6:
        insights.append({
            "category": "Fiber",
            "status": "info",
            "message": f"Your fiber average ({int(avg_fib)}g) is below your {t_fib}g target. Boost digestion by adding oats, flaxseeds, raspberries, or broccoli."
        })

    # Water analysis
    if avg_water < t_water - 500:
        insights.append({
            "category": "Hydration",
            "status": "warning",
            "message": f"Hydration is below optimal ({int(avg_water)}ml vs target {t_water}ml). Log at least one glass (+250ml) every few hours to support metabolic function."
        })
    elif avg_water >= t_water:
        insights.append({
            "category": "Hydration",
            "status": "success",
            "message": "Superb hydration! You are meeting or exceeding your daily water targets."
        })

    # If no warnings, add a general positive insight
    if not any(i["status"] == "warning" for i in insights):
        insights.append({
            "category": "Coach Notes",
            "status": "success",
            "message": "Overall, you are hitting your macros beautifully this week. Keep up the consistent logging!"
        })

    return {
        "averages": {
            "calories": int(avg_cal),
            "protein": int(avg_prot),
            "carbs": int(avg_carb),
            "fat": int(avg_fat),
            "fiber": int(avg_fib),
            "water": int(avg_water)
        },
        "targets": {
            "calories": t_cal,
            "protein": t_prot,
            "carbs": t_carb,
            "fat": t_fat,
            "fiber": t_fib,
            "water": t_water
        },
        "insights": insights
    }


