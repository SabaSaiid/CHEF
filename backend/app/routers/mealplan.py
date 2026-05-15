"""
Meal planner router — create, retrieve, and delete weekly meal plan entries.
Also generates an aggregated shopping list from planned meals.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from collections import defaultdict
import datetime

from app.database import get_db
from app.models import MealPlan, SavedRecipe, User
from app.auth import get_current_user
from app.schemas import MealPlanCreate, MealPlanResponse, ShoppingListItem

router = APIRouter(prefix="/api/mealplan", tags=["mealplan"])

_MAX_DATE_RANGE_DAYS = 90


def _parse_and_validate_dates(start_date: str, end_date: str) -> tuple[str, str]:
    """Validate YYYY-MM-DD date strings and ensure start <= end within 90 days."""
    try:
        start = datetime.date.fromisoformat(start_date)
        end = datetime.date.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")
    if end < start:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    if (end - start).days > _MAX_DATE_RANGE_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"Date range cannot exceed {_MAX_DATE_RANGE_DAYS} days"
        )
    return start_date, end_date


@router.get("", response_model=list[MealPlanResponse])
def get_meal_plan(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch meal plan entries for a specific date range (max 90 days)."""
    _parse_and_validate_dates(start_date, end_date)
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.date >= start_date,
        MealPlan.date <= end_date
    ).all()
    return plans


@router.post("", response_model=MealPlanResponse, status_code=201)
def create_meal_plan(
    req: MealPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a recipe to the meal plan. The recipe must already be in your saved collection."""
    # Verify recipe belongs to user
    recipe = db.query(SavedRecipe).filter(
        SavedRecipe.id == req.recipe_id,
        SavedRecipe.user_id == current_user.id
    ).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found in your saved collection")

    mp = MealPlan(
        user_id=current_user.id,
        recipe_id=req.recipe_id,
        date=req.date,
        meal_slot=req.meal_slot
    )
    db.add(mp)
    db.commit()
    db.refresh(mp)
    return mp


@router.delete("/{plan_id}", status_code=200)
def delete_meal_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a recipe from the meal plan."""
    mp = db.query(MealPlan).filter(MealPlan.id == plan_id, MealPlan.user_id == current_user.id).first()
    if not mp:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")

    db.delete(mp)
    db.commit()
    return {"message": "Meal plan entry removed"}


@router.get("/shopping-list", response_model=list[ShoppingListItem])
def get_shopping_list(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate an aggregated shopping list from planned meals in the date range (max 90 days).
    Ingredients are deduplicated and sorted alphabetically.
    """
    _parse_and_validate_dates(start_date, end_date)
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.date >= start_date,
        MealPlan.date <= end_date
    ).all()

    inventory: dict[str, dict] = defaultdict(lambda: {"count": 0, "recipes": set()})

    for mp in plans:
        if mp.recipe and mp.recipe.ingredients:
            items = [item.strip().lower() for item in mp.recipe.ingredients.split(",") if item.strip()]
            for item in items:
                inventory[item]["count"] += 1
                inventory[item]["recipes"].add(mp.recipe.title)

    shopping_list = [
        ShoppingListItem(
            ingredient=ing,
            count=data["count"],
            recipes_used_in=list(data["recipes"])
        )
        for ing, data in inventory.items()
    ]
    shopping_list.sort(key=lambda x: x.ingredient)
    return shopping_list
