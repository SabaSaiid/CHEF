"""
Demo seeder — one-click endpoint that populates the app with realistic data.

Creates a demo user, fills their TDEE profile, saves recipes, populates a
7-day meal plan, and inserts nutrition tracker logs so every screen in the
app has content for a video walkthrough.
"""

import json
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, SavedRecipe, MealPlan, NutritionLog
from app.auth import hash_password, create_access_token

router = APIRouter(prefix="/api/demo", tags=["demo"])

# Pre-selected recipe IDs from recipes.json for the demo
_DEMO_RECIPES_CACHE = None


def _load_demo_recipes():
    """Pick 8 diverse recipes from the dataset for the demo."""
    global _DEMO_RECIPES_CACHE
    if _DEMO_RECIPES_CACHE is not None:
        return _DEMO_RECIPES_CACHE

    recipes_path = Path(__file__).resolve().parent.parent / "recipes.json"
    
    try:
        with open(recipes_path, "r", encoding="utf-8") as f:
            all_recipes = json.load(f)
    except Exception as e:
        print(f"Error loading recipes: {e}")
        _DEMO_RECIPES_CACHE = []
        return []

    # Pick recipes that have images, nutrition, and instructions
    good = [r for r in all_recipes if r.get("image_url") and r.get("nutrition") and r.get("instructions")]
    random.seed(42)  # deterministic
    selected = random.sample(good, min(8, len(good)))
    _DEMO_RECIPES_CACHE = selected
    return selected


@router.post("/seed")
def seed_demo_data(db: Session = Depends(get_db)):
    """
    One-click demo setup. Creates or logs in a demo user and fills all
    app features with realistic data. Returns a JWT token.
    """

    # ── 1. Create or find demo user ─────────────────────────────
    DEMO_USERNAME = "Saba"
    DEMO_EMAIL = "saba@demo.chef"
    DEMO_PASSWORD = "demo123"

    user = db.query(User).filter(User.username == DEMO_USERNAME).first()

    if not user:
        user = User(
            username=DEMO_USERNAME,
            email=DEMO_EMAIL,
            hashed_password=hash_password(DEMO_PASSWORD),
        )
        db.add(user)
        db.flush()

    # ── 2. Create or Update TDEE profile ─────────────────────────────
    # Mifflin-St Jeor: BMR = (10 * 70) + (6.25 * 178) - (5 * 21) + 5 = 1712.5 ≈ 1713
    # TDEE = 1713 * 1.55 = 2655.15 ≈ 2655
    bmr = 1713
    tdee = 2655

    # Look for an existing profile or create a new one
    from app.models import UserProfile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id, UserProfile.profile_name == "Demo Profile").first()
    if not profile:
        profile = UserProfile(user_id=user.id, profile_name="Demo Profile")
        db.add(profile)
    
    profile.display_name = "Saba"
    profile.diet_type = "non-vegetarian"
    profile.is_active = True
    profile.age = 21
    profile.gender = "male"
    profile.weight_kg = 70.0
    profile.height_cm = 178.0  # 5 feet 10 inches
    profile.activity_level = "moderately_active"
    profile.goal = "maintain"
    profile.goal_intensity = "moderate"
    profile.body_fat_percent = None

    profile.bmr = bmr
    profile.tdee_maintenance = tdee
    profile.target_calories = tdee
    profile.target_protein = 140
    profile.target_carbs = 320
    profile.target_fat = 80
    profile.target_fiber_g = 30
    profile.target_water_ml = 3000
    profile.bmi = round(70.0 / (1.78 ** 2), 1)

    # Deactivate any other profiles
    db.query(UserProfile).filter(UserProfile.user_id == user.id, UserProfile.id != profile.id).update({"is_active": False})

    db.flush()

    # ── 3. Seed saved recipes ───────────────────────────────────
    # Clear old demo data first
    db.query(NutritionLog).filter(NutritionLog.user_id == user.id).delete()
    db.query(MealPlan).filter(MealPlan.user_id == user.id).delete()
    db.query(SavedRecipe).filter(SavedRecipe.user_id == user.id).delete()
    db.flush()

    demo_recipes = _load_demo_recipes()
    saved_recipes = []
    ratings = [5, 4, 5, 3, 4, 5, 4, 3]

    for i, r in enumerate(demo_recipes):
        sr = SavedRecipe(
            user_id=user.id,
            title=r["title"],
            image_url=r.get("image_url"),
            summary=r.get("summary"),
            ingredients=", ".join(r.get("ingredients", [])) if isinstance(r.get("ingredients"), list) else r.get("ingredients", ""),
            instructions=r.get("instructions"),
            source_url=r.get("source_url"),
            calories=r.get("nutrition", {}).get("calories"),
            protein_g=r.get("nutrition", {}).get("protein_g"),
            carbs_g=r.get("nutrition", {}).get("carbs_g"),
            fat_g=r.get("nutrition", {}).get("fat_g"),
            ready_in_minutes=r.get("ready_in_minutes"),
            servings=r.get("servings"),
            rating=ratings[i % len(ratings)],
        )
        db.add(sr)
        db.flush()
        saved_recipes.append(sr)

    # ── 4. Seed 7-day meal plan ─────────────────────────────────
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())  # This week's Monday

    slots_cycle = ["Breakfast", "Lunch", "Dinner"]
    recipe_idx = 0

    for day_offset in range(7):
        day = monday + timedelta(days=day_offset)
        day_str = day.isoformat()
        for slot in slots_cycle:
            if recipe_idx < len(saved_recipes):
                mp = MealPlan(
                    user_id=user.id,
                    recipe_id=saved_recipes[recipe_idx % len(saved_recipes)].id,
                    date=day_str,
                    meal_slot=slot,
                )
                db.add(mp)
                recipe_idx += 1

    db.flush()

    # ── 5. Seed 7 days of nutrition logs ────────────────────────
    demo_foods = [
        {"food": "Oatmeal with banana",   "cal": 320, "p": 10, "c": 55, "f": 8,  "slot": "Breakfast"},
        {"food": "Grilled chicken salad",  "cal": 420, "p": 35, "c": 20, "f": 18, "slot": "Lunch"},
        {"food": "Brown rice with dal",    "cal": 380, "p": 14, "c": 62, "f": 6,  "slot": "Dinner"},
        {"food": "Greek yogurt",           "cal": 150, "p": 15, "c": 12, "f": 5,  "slot": "Snack"},
        {"food": "Scrambled eggs on toast","cal": 350, "p": 22, "c": 30, "f": 16, "slot": "Breakfast"},
        {"food": "Paneer tikka wrap",      "cal": 480, "p": 24, "c": 42, "f": 22, "slot": "Lunch"},
        {"food": "Vegetable stir-fry",     "cal": 290, "p": 8,  "c": 35, "f": 14, "slot": "Dinner"},
        {"food": "Mixed nuts",             "cal": 200, "p": 6,  "c": 8,  "f": 18, "slot": "Snack"},
        {"food": "Smoothie bowl",          "cal": 280, "p": 12, "c": 45, "f": 6,  "slot": "Breakfast"},
        {"food": "Chicken biryani",        "cal": 550, "p": 30, "c": 65, "f": 18, "slot": "Lunch"},
        {"food": "Masoor dal with roti",   "cal": 340, "p": 16, "c": 50, "f": 6,  "slot": "Dinner"},
        {"food": "Apple with peanut butter","cal": 250, "p": 7, "c": 30, "f": 14, "slot": "Snack"},
    ]

    food_idx = 0
    for day_offset in range(7):
        day = today - timedelta(days=6 - day_offset)  # Past 7 days ending today
        day_str = day.isoformat()

        # 3-4 entries per day
        entries_count = 3 if day_offset % 3 == 0 else 4
        for _ in range(entries_count):
            food = demo_foods[food_idx % len(demo_foods)]
            # Add slight randomness to calories
            cal_jitter = random.randint(-30, 30)
            log = NutritionLog(
                user_id=user.id,
                food_item=food["food"],
                calories=food["cal"] + cal_jitter,
                protein_g=food["p"],
                carbs_g=food["c"],
                fat_g=food["f"],
                fiber_g=0,
                quantity=1.0,
                unit="serving",
                meal_slot=food["slot"],
                date=day_str,
            )
            db.add(log)
            food_idx += 1

    db.commit()

    # ── 6. Return JWT token ─────────────────────────────────────
    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "user_id": user.id,
        "message": "Demo data loaded successfully!",
    }
