"""
Meal planner router — create, retrieve, and delete weekly meal plan entries.
Also generates an aggregated shopping list from planned meals.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from collections import defaultdict
import datetime

from app.database import get_db
from app.models import MealPlan, SavedRecipe, User, PantryItem
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


def categorize_ingredient(name: str) -> str:
    name_lower = name.lower()
    
    # Meat & Seafood
    if any(k in name_lower for k in ["chicken", "beef", "pork", "fish", "salmon", "shrimp", "turkey", "lamb", "bacon", "tuna", "seafood", "steak", "meat"]):
        return "Meat & Seafood"
    
    # Dairy & Eggs
    if any(k in name_lower for k in ["milk", "cheese", "yogurt", "butter", "egg", "cream", "cheddar", "mozzarella", "parmesan", "dairy"]):
        return "Dairy & Eggs"
        
    # Produce (Fruits & Veggies)
    if any(k in name_lower for k in ["tomato", "onion", "garlic", "potato", "spinach", "lemon", "lime", "carrot", "apple", "banana", "pepper", "basil", "parsley", "ginger", "lettuce", "cucumber", "mushroom", "cilantro", "avocado", "broccoli", "cabbage", "zucchini", "vegetable", "fruit"]):
        return "Produce"
        
    # Grains & Bakery
    if any(k in name_lower for k in ["bread", "flour", "rice", "pasta", "noodle", "oats", "tortilla", "quinoa", "grain"]):
        return "Grains & Bakery"
        
    # Pantry & Spices
    if any(k in name_lower for k in ["salt", "pepper", "oil", "sugar", "sauce", "soy", "vinegar", "honey", "broth", "stock", "mustard", "mayo", "oregano", "cumin", "cinnamon", "vanilla", "powder", "spice", "herb"]):
        return "Pantry & Spices"
        
    return "Other / Miscellaneous"


@router.get("/grocery-list")
def get_grocery_list(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a smart categorized grocery list from scheduled meals,
    subtracting items already present in the user's pantry.
    """
    _parse_and_validate_dates(start_date, end_date)
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.date >= start_date,
        MealPlan.date <= end_date
    ).all()

    # Get user's pantry items in stock
    pantry_items = db.query(PantryItem).filter(PantryItem.user_id == current_user.id).all()
    pantry_set = {pi.ingredient_name.lower().strip() for pi in pantry_items if pi.quantity > 0}

    # Aggregate ingredients from planned meals
    raw_ingredients = defaultdict(list)  # ingredient -> list of recipe titles
    for mp in plans:
        if mp.recipe and mp.recipe.ingredients:
            import json
            items = []
            try:
                # If it's a JSON array
                parsed = json.loads(mp.recipe.ingredients)
                if isinstance(parsed, list):
                    items = [str(x) for x in parsed]
                else:
                    items = [str(parsed)]
            except Exception:
                # Fallback to comma separated
                items = [item.strip() for item in mp.recipe.ingredients.split(",") if item.strip()]

            for item in items:
                raw_ingredients[item.strip()].append(mp.recipe.title)

    categories = {
        "Produce": [],
        "Meat & Seafood": [],
        "Dairy & Eggs": [],
        "Grains & Bakery": [],
        "Pantry & Spices": [],
        "Other / Miscellaneous": []
    }
    in_pantry_skipped = []

    for ing_name, recipes in raw_ingredients.items():
        ing_lower = ing_name.lower().strip()
        if not ing_lower:
            continue
        
        # Check if this exact ingredient name or a substantial substring is in the pantry
        is_in_pantry = False
        for p_item in pantry_set:
            if p_item in ing_lower or ing_lower in p_item:
                is_in_pantry = True
                break
                
        if is_in_pantry:
            in_pantry_skipped.append(ing_name)
        else:
            cat = categorize_ingredient(ing_name)
            categories[cat].append({
                "name": ing_name,
                "recipes": list(set(recipes))
            })

    # Filter out empty categories
    active_categories = {k: v for k, v in categories.items() if len(v) > 0}

    return {
        "categories": active_categories,
        "in_pantry_skipped": in_pantry_skipped
    }


@router.post("/log-today")
def log_today_meals(
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Automatically copy today's planned meals into the nutrition log tracker for today's date.
    """
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.date == date
    ).all()

    if not plans:
        return {"message": "No meals planned for today to log.", "logged_count": 0}

    from app.models import NutritionLog
    logged_count = 0

    for mp in plans:
        if mp.recipe:
            cal = mp.recipe.calories or (mp.recipe.nutrition.get("calories") if isinstance(mp.recipe.nutrition, dict) else 0) or 0
            prot = mp.recipe.protein_g or (mp.recipe.nutrition.get("protein_g") if isinstance(mp.recipe.nutrition, dict) else 0) or 0
            carbs = mp.recipe.carbs_g or (mp.recipe.nutrition.get("carbs_g") if isinstance(mp.recipe.nutrition, dict) else 0) or 0
            fat = mp.recipe.fat_g or (mp.recipe.nutrition.get("fat_g") if isinstance(mp.recipe.nutrition, dict) else 0) or 0

            log_entry = NutritionLog(
                user_id=current_user.id,
                date=date,
                food_item=f"[Planned] {mp.recipe.title}",
                meal_slot=mp.meal_slot or "Snack",
                calories=float(cal),
                protein_g=float(prot),
                carbs_g=float(carbs),
                fat_g=float(fat),
                fiber_g=0.0,
                quantity=1.0,
                unit="serving",
            )
            db.add(log_entry)
            logged_count += 1

    db.commit()
    return {"message": f"Successfully logged {logged_count} planned meals into your Nutrition Tracker! ⚡", "logged_count": logged_count}


@router.post("/autofill")
def autofill_meal_plan(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate weekly smart meal plan matching user targets and preferences."""
    from app.routers.diet_planner import generate_weekly_diet_plan
    return generate_weekly_diet_plan(current_user=current_user, db=db)


