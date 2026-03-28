"""
Nutrition lookup router — uses demo data with a built-in nutrition database.
Falls back gracefully when no external API key is configured.
"""

from fastapi import APIRouter
from app.schemas import NutritionRequest, NutritionData

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])

# ── Built-in nutrition database (per 100g or per serving) ──────
NUTRITION_DB: dict[str, dict] = {
    "chicken":      {"calories": 165, "protein_g": 31,  "carbs_g": 0,   "fat_g": 3.6, "fiber_g": 0,   "sugar_g": 0},
    "chicken breast":{"calories": 165, "protein_g": 31,  "carbs_g": 0,   "fat_g": 3.6, "fiber_g": 0,   "sugar_g": 0},
    "rice":         {"calories": 130, "protein_g": 2.7, "carbs_g": 28,  "fat_g": 0.3, "fiber_g": 0.4, "sugar_g": 0},
    "pasta":        {"calories": 131, "protein_g": 5,   "carbs_g": 25,  "fat_g": 1.1, "fiber_g": 1.8, "sugar_g": 0.6},
    "egg":          {"calories": 155, "protein_g": 13,  "carbs_g": 1.1, "fat_g": 11,  "fiber_g": 0,   "sugar_g": 1.1},
    "eggs":         {"calories": 155, "protein_g": 13,  "carbs_g": 1.1, "fat_g": 11,  "fiber_g": 0,   "sugar_g": 1.1},
    "bread":        {"calories": 265, "protein_g": 9,   "carbs_g": 49,  "fat_g": 3.2, "fiber_g": 2.7, "sugar_g": 5},
    "butter":       {"calories": 717, "protein_g": 0.9, "carbs_g": 0.1, "fat_g": 81,  "fiber_g": 0,   "sugar_g": 0.1},
    "cheese":       {"calories": 402, "protein_g": 25,  "carbs_g": 1.3, "fat_g": 33,  "fiber_g": 0,   "sugar_g": 0.5},
    "milk":         {"calories": 42,  "protein_g": 3.4, "carbs_g": 5,   "fat_g": 1,   "fiber_g": 0,   "sugar_g": 5},
    "tomato":       {"calories": 18,  "protein_g": 0.9, "carbs_g": 3.9, "fat_g": 0.2, "fiber_g": 1.2, "sugar_g": 2.6},
    "onion":        {"calories": 40,  "protein_g": 1.1, "carbs_g": 9.3, "fat_g": 0.1, "fiber_g": 1.7, "sugar_g": 4.2},
    "garlic":       {"calories": 149, "protein_g": 6.4, "carbs_g": 33,  "fat_g": 0.5, "fiber_g": 2.1, "sugar_g": 1},
    "olive oil":    {"calories": 884, "protein_g": 0,   "carbs_g": 0,   "fat_g": 100, "fiber_g": 0,   "sugar_g": 0},
    "banana":       {"calories": 89,  "protein_g": 1.1, "carbs_g": 23,  "fat_g": 0.3, "fiber_g": 2.6, "sugar_g": 12},
    "apple":        {"calories": 52,  "protein_g": 0.3, "carbs_g": 14,  "fat_g": 0.2, "fiber_g": 2.4, "sugar_g": 10},
    "salmon":       {"calories": 208, "protein_g": 20,  "carbs_g": 0,   "fat_g": 13,  "fiber_g": 0,   "sugar_g": 0},
    "broccoli":     {"calories": 34,  "protein_g": 2.8, "carbs_g": 7,   "fat_g": 0.4, "fiber_g": 2.6, "sugar_g": 1.7},
    "carrot":       {"calories": 41,  "protein_g": 0.9, "carbs_g": 10,  "fat_g": 0.2, "fiber_g": 2.8, "sugar_g": 4.7},
    "potato":       {"calories": 77,  "protein_g": 2,   "carbs_g": 17,  "fat_g": 0.1, "fiber_g": 2.2, "sugar_g": 0.8},
    "flour":        {"calories": 364, "protein_g": 10,  "carbs_g": 76,  "fat_g": 1,   "fiber_g": 2.7, "sugar_g": 0.3},
    "sugar":        {"calories": 387, "protein_g": 0,   "carbs_g": 100, "fat_g": 0,   "fiber_g": 0,   "sugar_g": 100},
    "honey":        {"calories": 304, "protein_g": 0.3, "carbs_g": 82,  "fat_g": 0,   "fiber_g": 0.2, "sugar_g": 82},
    "yogurt":       {"calories": 59,  "protein_g": 10,  "carbs_g": 3.6, "fat_g": 0.7, "fiber_g": 0,   "sugar_g": 3.2},
    "bell pepper":  {"calories": 31,  "protein_g": 1,   "carbs_g": 6,   "fat_g": 0.3, "fiber_g": 2.1, "sugar_g": 4.2},
    "lettuce":      {"calories": 15,  "protein_g": 1.4, "carbs_g": 2.9, "fat_g": 0.2, "fiber_g": 1.3, "sugar_g": 0.8},
    "cucumber":     {"calories": 16,  "protein_g": 0.7, "carbs_g": 3.6, "fat_g": 0.1, "fiber_g": 0.5, "sugar_g": 1.7},
    "avocado":      {"calories": 160, "protein_g": 2,   "carbs_g": 9,   "fat_g": 15,  "fiber_g": 7,   "sugar_g": 0.7},
    "beef":         {"calories": 250, "protein_g": 26,  "carbs_g": 0,   "fat_g": 15,  "fiber_g": 0,   "sugar_g": 0},
    "pork":         {"calories": 242, "protein_g": 27,  "carbs_g": 0,   "fat_g": 14,  "fiber_g": 0,   "sugar_g": 0},
    "tofu":         {"calories": 76,  "protein_g": 8,   "carbs_g": 1.9, "fat_g": 4.8, "fiber_g": 0.3, "sugar_g": 0.6},
    "soy sauce":    {"calories": 53,  "protein_g": 8.1, "carbs_g": 4.9, "fat_g": 0.6, "fiber_g": 0.8, "sugar_g": 0.4},
    "lemon":        {"calories": 29,  "protein_g": 1.1, "carbs_g": 9.3, "fat_g": 0.3, "fiber_g": 2.8, "sugar_g": 2.5},
}


def _lookup(food: str) -> dict | None:
    """Case-insensitive lookup in the nutrition database."""
    key = food.lower().strip()
    if key in NUTRITION_DB:
        return NUTRITION_DB[key]
    # Partial match
    for db_key, data in NUTRITION_DB.items():
        if key in db_key or db_key in key:
            return data
    return None


@router.post("/analyze", response_model=NutritionData)
def analyze_nutrition(req: NutritionRequest):
    """
    Look up nutrition data for a food item.
    Uses a built-in database of ~30 common foods.
    Values are per 100g, scaled by quantity.
    """
    data = _lookup(req.food_item)

    if data is None:
        # Return zeroes with a note rather than an error
        return NutritionData(
            food_item=req.food_item,
            quantity=req.quantity,
            unit=req.unit,
            source="demo (not found — try a common food like chicken, rice, eggs, etc.)",
        )

    scale = req.quantity
    return NutritionData(
        food_item=req.food_item,
        quantity=req.quantity,
        unit=req.unit,
        calories=round(data["calories"] * scale, 1),
        protein_g=round(data["protein_g"] * scale, 1),
        carbs_g=round(data["carbs_g"] * scale, 1),
        fat_g=round(data["fat_g"] * scale, 1),
        fiber_g=round(data.get("fiber_g", 0) * scale, 1),
        sugar_g=round(data.get("sugar_g", 0) * scale, 1),
        source="demo",
    )
