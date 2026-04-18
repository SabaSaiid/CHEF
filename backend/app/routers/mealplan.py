from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from collections import defaultdict
import datetime

from app.database import get_db
from app.models import MealPlan, SavedRecipe, User
from app.auth import get_current_user
from app.schemas import MealPlanCreate, MealPlanResponse, ShoppingListItem

router = APIRouter(prefix="/api/mealplan", tags=["mealplan"])


@router.get("", response_model=List[MealPlanResponse])
def get_meal_plan(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch meal plan entries for a specific date range."""
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.date >= start_date,
        MealPlan.date <= end_date
    ).all()
    return plans


@router.post("", response_model=MealPlanResponse)
def create_meal_plan(
    req: MealPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a recipe to the meal plan."""
    # Verify recipe belongs to user
    recipe = db.query(SavedRecipe).filter(
        SavedRecipe.id == req.recipe_id, 
        SavedRecipe.user_id == current_user.id
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found in your saved collection")

    # Optional: check if slot is already occupied, but overwriting/multiple is fine for now
    
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


@router.delete("/{plan_id}")
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


@router.get("/shopping-list", response_model=List[ShoppingListItem])
def get_shopping_list(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate an aggregated shopping list based on planned meals in the date range.
    """
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.date >= start_date,
        MealPlan.date <= end_date
    ).all()

    # Dictionary to aggregate: ingredient_name -> {"count": int, "recipes": set()}
    # We will do exact string matching since parsing natural language quantities perfectly requires NLP,
    # and this covers the basic V1 usecase nicely.
    inventory = defaultdict(lambda: {"count": 0, "recipes": set()})

    for mp in plans:
        if mp.recipe and mp.recipe.ingredients:
            # ingredients are stored as comma-separated string
            items = [item.strip().lower() for item in mp.recipe.ingredients.split(',') if item.strip()]
            for item in items:
                inventory[item]["count"] += 1
                inventory[item]["recipes"].add(mp.recipe.title)

    # Convert to response model
    shopping_list = []
    for ing, data in inventory.items():
        shopping_list.append(ShoppingListItem(
            ingredient=ing,
            count=data["count"],
            recipes_used_in=list(data["recipes"])
        ))
        
    # Sort alphabetically by ingredient name
    shopping_list.sort(key=lambda x: x.ingredient)
    return shopping_list
