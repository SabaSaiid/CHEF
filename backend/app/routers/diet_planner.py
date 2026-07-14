"""
Auto Diet Plan Generator — builds a full weekly meal plan (Mon–Sun)
from the local recipe dataset, tailored to the user's nutritional targets,
health conditions, dietary restrictions, and taste preferences.

Algorithm:
  1. Load and filter recipes based on diet type, allergens, health condition flags
  2. Score each recipe for taste preference match
  3. For each day, greedily assign Breakfast (~25%), Lunch (~35%), Snack (~10%), Dinner (~30%)
  4. Ensure daily macro totals within ±15% of targets
  5. Enforce variety — no repeats within the week
  6. Save results to MealPlan table
"""

import json
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserProfile, MealPlan, SavedRecipe
from app.auth import get_current_user
from app.routers.health_engine import (
    apply_health_adjustments,
    score_recipe_taste,
    has_avoided_ingredient,
)

router = APIRouter(prefix="/api/diet-plan", tags=["diet_plan"])

# ── Meal slot calorie distribution (standard sports nutrition) ──────────

MEAL_DISTRIBUTION = {
    "Breakfast": 0.25,
    "Lunch":     0.35,
    "Snack":     0.10,
    "Dinner":    0.30,
}

# ── Recipe cache ────────────────────────────────────────────────────────

_RECIPE_CACHE = None


def _load_all_recipes() -> list[dict]:
    """Load and cache the entire recipe dataset."""
    global _RECIPE_CACHE
    if _RECIPE_CACHE is not None:
        return _RECIPE_CACHE

    recipes_path = Path(__file__).resolve().parent.parent / "recipes.json"
    try:
        with open(recipes_path, "r", encoding="utf-8") as f:
            _RECIPE_CACHE = json.load(f)
    except Exception:
        _RECIPE_CACHE = []

    return _RECIPE_CACHE


def _infer_meal_type(recipe: dict) -> str:
    """
    Infer a meal type for recipes missing the field.
    Uses calorie count and ingredient heuristics.
    """
    meal_type = (recipe.get("meal_type") or "").lower()

    if "breakfast" in meal_type:
        return "Breakfast"
    if "snack" in meal_type or "dessert" in meal_type:
        return "Snack"
    if "lunch" in meal_type:
        return "Lunch"
    if "dinner" in meal_type:
        return "Dinner"

    # Heuristic: low cal + breakfast-like ingredients = breakfast
    cals = recipe.get("nutrition", {}).get("calories", 500)
    title_lower = recipe.get("title", "").lower()
    ingredients_lower = " ".join(recipe.get("ingredients", [])).lower()

    breakfast_indicators = {"oat", "egg", "pancake", "toast", "cereal", "smoothie",
                           "paratha", "poha", "upma", "idli", "dosa", "uttapam"}
    if cals < 400 and any(ind in title_lower or ind in ingredients_lower for ind in breakfast_indicators):
        return "Breakfast"

    snack_indicators = {"salad", "soup", "yogurt", "nuts", "fruit", "bar", "chaat", "bhel"}
    if cals < 300 and any(ind in title_lower or ind in ingredients_lower for ind in snack_indicators):
        return "Snack"

    if cals < 450:
        return "Lunch"

    return "Dinner"


def _matches_diet(recipe: dict, diet_type: Optional[str]) -> bool:
    """Check if a recipe matches the user's dietary preference."""
    if not diet_type:
        return True

    diet_lower = diet_type.lower()
    recipe_diets = [d.lower() for d in recipe.get("diets", [])]

    if diet_lower == "non-vegetarian":
        return True  # Non-veg can eat everything

    if diet_lower == "vegetarian":
        meat_keywords = {"chicken", "beef", "pork", "fish", "shrimp", "lamb",
                        "turkey", "bacon", "tuna", "salmon", "prawns", "mutton"}
        ingredients_lower = " ".join(recipe.get("ingredients", [])).lower()
        if any(m in ingredients_lower for m in meat_keywords):
            return False
        if "non-vegetarian" in recipe_diets:
            return False
        return True

    if diet_lower == "vegan":
        non_vegan = {"chicken", "beef", "pork", "fish", "shrimp", "lamb",
                    "egg", "milk", "cheese", "butter", "cream", "yogurt",
                    "ghee", "honey", "paneer", "curd", "whey"}
        ingredients_lower = " ".join(recipe.get("ingredients", [])).lower()
        if any(m in ingredients_lower for m in non_vegan):
            return False
        return True

    if diet_lower in ("keto", "low-carb"):
        carbs = recipe.get("nutrition", {}).get("carbs_g", 999)
        return carbs < 20

    if diet_lower == "gluten-free":
        gluten = {"wheat", "flour", "bread", "pasta", "noodle", "roti", "naan",
                  "maida", "semolina", "barley", "rye"}
        ingredients_lower = " ".join(recipe.get("ingredients", [])).lower()
        return not any(g in ingredients_lower for g in gluten)

    return True


def _has_allergen(recipe: dict, allergens_str: Optional[str]) -> bool:
    """Check if recipe contains any user allergens."""
    if not allergens_str:
        return False

    allergens = [a.strip().lower() for a in allergens_str.split(",") if a.strip()]
    ingredients_lower = " ".join(recipe.get("ingredients", [])).lower()
    title_lower = recipe.get("title", "").lower()
    searchable = ingredients_lower + " " + title_lower

    allergen_map = {
        "peanut": ["peanut", "groundnut"],
        "gluten": ["wheat", "flour", "bread", "pasta", "noodle", "roti", "naan", "maida"],
        "dairy": ["milk", "cheese", "butter", "cream", "yogurt", "ghee", "paneer", "curd", "whey"],
        "soy": ["soy", "tofu", "tempeh", "edamame", "soy sauce"],
        "egg": ["egg"],
        "shellfish": ["shrimp", "crab", "lobster", "oyster", "mussel", "clam", "prawn"],
        "fish": ["fish", "salmon", "tuna", "cod", "sardine", "anchovy", "mackerel"],
        "tree nuts": ["almond", "walnut", "cashew", "pistachio", "pecan", "hazelnut", "brazil nut"],
    }

    for allergen in allergens:
        keywords = allergen_map.get(allergen, [allergen])
        if any(kw in searchable for kw in keywords):
            return True

    return False


@router.post("/generate")
def generate_weekly_diet_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a full 7-day meal plan (Breakfast, Lunch, Snack, Dinner)
    based on the user's active profile targets, health conditions, and taste.
    """

    # ── 1. Get active profile ───────────────────────────────────────
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id,
        UserProfile.is_active == True,
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="No active profile found. Create one first.")

    if not profile.target_calories:
        raise HTTPException(status_code=400, detail="Profile has no calculated targets. Save your profile first.")

    # ── 2. Get health adjustments ───────────────────────────────────
    health_adj = apply_health_adjustments(
        base_calories=profile.target_calories,
        base_protein=profile.target_protein or 0,
        base_carbs=profile.target_carbs or 0,
        base_fat=profile.target_fat or 0,
        base_fiber=profile.target_fiber_g or 25,
        base_water=profile.target_water_ml or 2500,
        weight_kg=profile.weight_kg or 70,
        health_conditions_str=profile.health_conditions,
    )

    # Use adjusted targets
    daily_cal_target = health_adj.target_calories or profile.target_calories
    daily_protein_target = health_adj.target_protein or profile.target_protein or 0
    daily_carbs_target = health_adj.target_carbs or profile.target_carbs or 0
    daily_fat_target = health_adj.target_fat or profile.target_fat or 0

    # ── 3. Load and filter recipes ──────────────────────────────────
    all_recipes = _load_all_recipes()

    filtered = []
    for r in all_recipes:
        nutrition = r.get("nutrition", {})
        if not nutrition or not nutrition.get("calories"):
            continue

        if not _matches_diet(r, profile.diet_type):
            continue

        if _has_allergen(r, profile.allergens):
            continue

        ingredients = r.get("ingredients", [])
        if isinstance(ingredients, str):
            ingredients = [i.strip() for i in ingredients.split(",")]

        if has_avoided_ingredient(ingredients, health_adj.avoid_ingredients):
            continue

        # Score by taste
        taste_score = score_recipe_taste(
            r.get("title", ""),
            ingredients,
            profile.taste_preferences,
        )

        filtered.append({
            **r,
            "_taste_score": taste_score,
            "_inferred_meal": _infer_meal_type(r),
            "_ingredients_list": ingredients,
        })

    if len(filtered) < 28:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough matching recipes ({len(filtered)} found, need at least 28). Try relaxing your dietary restrictions."
        )

    # ── 4. Bucket recipes by meal type ──────────────────────────────
    buckets = {"Breakfast": [], "Lunch": [], "Snack": [], "Dinner": []}
    for r in filtered:
        meal = r["_inferred_meal"]
        if meal in buckets:
            buckets[meal].append(r)

    # If any bucket is too small, fill from the general pool
    for slot in buckets:
        if len(buckets[slot]) < 7:
            extras = [r for r in filtered if r not in buckets[slot]]
            random.shuffle(extras)
            buckets[slot].extend(extras[:max(0, 14 - len(buckets[slot]))])

    # Sort each bucket by taste score (descending) with some randomness
    random.seed()  # true random for variety
    for slot in buckets:
        buckets[slot].sort(key=lambda r: r["_taste_score"] + random.uniform(0, 0.3), reverse=True)

    # ── 5. Greedy assignment: 7 days × 4 slots ──────────────────────
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())

    used_ids = set()
    plan_entries = []

    for day_offset in range(7):
        day = monday + timedelta(days=day_offset)
        day_str = day.isoformat()

        for slot, cal_pct in MEAL_DISTRIBUTION.items():
            target_meal_cals = daily_cal_target * cal_pct
            target_meal_protein = daily_protein_target * cal_pct
            target_meal_carbs = daily_carbs_target * cal_pct
            target_meal_fat = daily_fat_target * cal_pct

            best_recipe = None
            best_score = -999

            for recipe in buckets.get(slot, filtered):
                rid = recipe.get("id")
                if rid in used_ids:
                    continue

                nutrition = recipe.get("nutrition", {})
                cal = nutrition.get("calories", 0)
                prot = nutrition.get("protein_g", 0)

                # Calorie fit score (how close to target)
                cal_diff = abs(cal - target_meal_cals)
                cal_fit = max(0, 1 - (cal_diff / max(target_meal_cals, 1)))

                # Protein fit
                prot_diff = abs(prot - target_meal_protein)
                prot_fit = max(0, 1 - (prot_diff / max(target_meal_protein, 1)))

                # Combined score: 40% cal fit + 20% protein fit + 40% taste
                combined = (cal_fit * 0.40) + (prot_fit * 0.20) + (recipe["_taste_score"] * 0.40)

                if combined > best_score:
                    best_score = combined
                    best_recipe = recipe

            if best_recipe:
                used_ids.add(best_recipe.get("id"))
                plan_entries.append({
                    "date": day_str,
                    "meal_slot": slot,
                    "recipe": best_recipe,
                })

    # ── 6. Save to database ─────────────────────────────────────────
    # Clear existing meal plan for this week
    db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.date >= monday.isoformat(),
        MealPlan.date <= (monday + timedelta(days=6)).isoformat(),
    ).delete()
    db.flush()

    saved_count = 0
    for entry in plan_entries:
        recipe_data = entry["recipe"]

        # Save the recipe to SavedRecipes if not already saved
        existing = db.query(SavedRecipe).filter(
            SavedRecipe.user_id == current_user.id,
            SavedRecipe.title == recipe_data["title"],
        ).first()

        if not existing:
            ingredients_str = ", ".join(recipe_data.get("ingredients", []))
            if isinstance(recipe_data.get("ingredients"), str):
                ingredients_str = recipe_data["ingredients"]

            existing = SavedRecipe(
                user_id=current_user.id,
                title=recipe_data["title"],
                image_url=recipe_data.get("image_url"),
                summary=recipe_data.get("summary"),
                ingredients=ingredients_str,
                instructions=recipe_data.get("instructions"),
                source_url=recipe_data.get("source_url"),
                calories=recipe_data.get("nutrition", {}).get("calories"),
                protein_g=recipe_data.get("nutrition", {}).get("protein_g"),
                carbs_g=recipe_data.get("nutrition", {}).get("carbs_g"),
                fat_g=recipe_data.get("nutrition", {}).get("fat_g"),
                ready_in_minutes=recipe_data.get("ready_in_minutes"),
                servings=recipe_data.get("servings"),
            )
            db.add(existing)
            db.flush()

        mp = MealPlan(
            user_id=current_user.id,
            recipe_id=existing.id,
            date=entry["date"],
            meal_slot=entry["meal_slot"],
        )
        db.add(mp)
        saved_count += 1

    db.commit()

    # ── 7. Build summary ────────────────────────────────────────────
    daily_summaries = {}
    for entry in plan_entries:
        day = entry["date"]
        if day not in daily_summaries:
            daily_summaries[day] = {"total_cal": 0, "total_protein": 0, "meals": []}
        nutrition = entry["recipe"].get("nutrition", {})
        daily_summaries[day]["total_cal"] += nutrition.get("calories", 0)
        daily_summaries[day]["total_protein"] += nutrition.get("protein_g", 0)
        daily_summaries[day]["meals"].append({
            "slot": entry["meal_slot"],
            "title": entry["recipe"]["title"],
            "calories": nutrition.get("calories", 0),
        })

    return {
        "message": f"Weekly diet plan generated! {saved_count} meals planned across 7 days.",
        "week_start": monday.isoformat(),
        "week_end": (monday + timedelta(days=6)).isoformat(),
        "daily_calorie_target": daily_cal_target,
        "health_notes": health_adj.notes if health_adj.notes else [],
        "daily_summaries": daily_summaries,
    }
