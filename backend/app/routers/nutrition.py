"""
Nutrition lookup router — uses a built-in nutrition database of 350+ foods
verified against USDA FoodData Central and ICMR-NIN standards.
Supports smart multi-tiered fuzzy search, token matching, unit conversion scaling,
micronutrient breakdowns, glycemic index ratings, and live auto-complete suggestions.
"""

import json
import re
import difflib
from pathlib import Path
from fastapi import APIRouter, Query
from app.schemas import NutritionRequest, NutritionData

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])


# ── Built-in nutrition database (per 100g base values) ──────
NUTRITION_DB: dict[str, dict] = {}

# ── Load extended master data from JSON ───────────────────────────────
_extra_path = Path(__file__).parent.parent / "nutrition_extra.json"
if _extra_path.exists():
    with open(_extra_path) as _f:
        NUTRITION_DB = json.load(_f)


MODIFIERS = {'fresh', 'raw', 'cooked', 'boiled', 'grilled', 'baked', 'fried', 'large', 'small', 'organic', 'pieces', 'piece', 'slice', 'slices'}


def parse_quantity_unit(food_item: str, default_qty: float, default_unit: str):
    """Extract embedded number and unit prefix/suffix if present in input string."""
    pattern = r'^([\d.]+)\s*(g|grams|gram|kg|kilograms|ml|l|liter|liters|oz|ounce|ounces|lb|lbs|pound|cups|cup|tbsp|tsp|tablespoon|teaspoon|serving|servings|pcs|piece|pieces)?\s+(.+)$'
    m = re.match(pattern, food_item.strip(), re.IGNORECASE)
    if m:
        val = float(m.group(1))
        u = m.group(2).lower() if m.group(2) else default_unit
        item = m.group(3).strip()
        return val, u, item
    return default_qty, default_unit, food_item


def calculate_unit_scale(qty: float, unit: str, serving_weight_g: float = 100.0) -> float:
    """Calculate scaling multiplier relative to per-100g base values."""
    u = (unit or "").lower().strip()
    if u in ['g', 'gram', 'grams', 'ml', 'milliliter', 'milliliters']:
        return qty / 100.0
    elif u in ['kg', 'kilogram', 'kilograms']:
        return (qty * 1000.0) / 100.0
    elif u in ['l', 'liter', 'liters']:
        return (qty * 1000.0) / 100.0
    elif u in ['oz', 'ounce', 'ounces']:
        return (qty * 28.35) / 100.0
    elif u in ['lb', 'lbs', 'pound', 'pounds']:
        return (qty * 453.59) / 100.0
    elif u in ['cup', 'cups']:
        return (qty * 240.0) / 100.0
    elif u in ['tbsp', 'tablespoon', 'tablespoons']:
        return (qty * 15.0) / 100.0
    elif u in ['tsp', 'teaspoon', 'teaspoons']:
        return (qty * 5.0) / 100.0
    elif u in ['serving', 'servings', 'pcs', 'piece', 'pieces', 'item', 'slice', 'slices', 'scoop', 'scoops', '']:
        if qty >= 20.0 and u in ['serving', 'servings', 'pcs', 'piece', 'pieces', 'item', '']:
            # User entered raw weight in quantity field (e.g. 150) with default unit
            return qty / 100.0
        serving_g = serving_weight_g if serving_weight_g and serving_weight_g > 0 else 100.0
        return (qty * serving_g) / 100.0
    return qty


def _smart_lookup(food: str):
    """
    Multi-tiered accurate lookup:
    1. Exact match
    2. Common Singular/Plural aliases
    3. Cleaned modifier match
    4. Whole-word match
    5. Token Jaccard match
    6. Fuzzy SequenceMatcher (for typos)
    7. Fallback suggestions list
    """
    key = food.lower().strip()
    if not key:
        return None, None, []

    # 1. Exact match
    if key in NUTRITION_DB:
        return key, NUTRITION_DB[key], []

    # 2. Common Plural/Singular aliases
    aliases = {
        'apples': 'apple', 'eggs': 'egg', 'peanuts': 'peanut', 'almonds': 'almond',
        'tomatoes': 'tomato', 'potatoes': 'potato', 'chickens': 'chicken',
        'carrots': 'carrot', 'onions': 'onion', 'bananas': 'banana', 'oranges': 'orange',
        'mangoes': 'mango', 'grapes': 'grapes', 'strawberries': 'strawberry', 'blueberries': 'blueberry'
    }
    if key in aliases and aliases[key] in NUTRITION_DB:
        target = aliases[key]
        return target, NUTRITION_DB[target], []

    # 3. Cleaned modifier match
    tokens = key.split()
    cleaned_tokens = [t for t in tokens if t not in MODIFIERS]
    cleaned_key = ' '.join(cleaned_tokens)
    if cleaned_key and cleaned_key in NUTRITION_DB:
        return cleaned_key, NUTRITION_DB[cleaned_key], []

    # 4. Whole-word Substring / Word Match
    word_matches = []
    for db_key in NUTRITION_DB:
        pattern1 = r'\b' + re.escape(db_key) + r'\b'
        pattern2 = r'\b' + re.escape(key) + r'\b'
        if re.search(pattern1, key):
            word_matches.append((db_key, len(db_key)))
        elif re.search(pattern2, db_key):
            word_matches.append((db_key, -len(db_key)))

    if word_matches:
        word_matches.sort(key=lambda x: x[1], reverse=True)
        best = word_matches[0][0]
        return best, NUTRITION_DB[best], []

    # 5. Token Jaccard Match
    q_tokens = set(tokens)
    best_key = None
    best_score = 0.0

    for db_key in NUTRITION_DB:
        db_tokens = set(db_key.split())
        common = q_tokens.intersection(db_tokens)
        if not common:
            continue
        jaccard = len(common) / len(q_tokens.union(db_tokens))
        if jaccard > best_score:
            best_score = jaccard
            best_key = db_key

    if best_key and best_score >= 0.5:
        return best_key, NUTRITION_DB[best_key], []

    # 6. Fuzzy SequenceMatcher ratio (for typos)
    best_fuzzy_key = None
    best_fuzzy_ratio = 0.0
    for db_key in NUTRITION_DB:
        ratio = difflib.SequenceMatcher(None, key, db_key).ratio()
        if ratio > best_fuzzy_ratio:
            best_fuzzy_ratio = ratio
            best_fuzzy_key = db_key

    if best_fuzzy_key and best_fuzzy_ratio >= 0.75:
        return best_fuzzy_key, NUTRITION_DB[best_fuzzy_key], []

    # 7. Suggestions
    suggestions = [k for k in NUTRITION_DB if key in k or any(t in k for t in q_tokens)][:5]
    return None, None, suggestions


@router.get("/suggest", response_model=list[str])
def suggest_foods(q: str = Query("", min_length=0, description="Search query")):
    """Get live auto-complete search suggestions from the nutrition database."""
    query = q.lower().strip()
    if not query:
        return ["chicken breast", "egg", "rice", "oats", "paneer", "apple", "milk", "peanut butter", "water", "salmon"]

    matches = []
    for key in NUTRITION_DB:
        if key.startswith(query):
            matches.append(key)

    for key in NUTRITION_DB:
        if query in key and key not in matches:
            matches.append(key)

    return matches[:10]


@router.post("/analyze", response_model=NutritionData, response_model_exclude_none=True)
def analyze_nutrition(req: NutritionRequest):
    """
    Look up nutrition data for a food item.
    Uses a built-in database of 350+ foods verified against USDA & ICMR-NIN standards.
    Supports micronutrient breakdown, glycemic index, health density score, and accurate portion scaling.
    """
    qty, unit, food_name = parse_quantity_unit(req.food_item, req.quantity, req.unit)
    matched_key, data, suggestions = _smart_lookup(food_name)

    if data is None:
        return NutritionData(
            food_item=req.food_item.title(),
            quantity=req.quantity,
            unit=req.unit,
            calories=0.0,
            protein_g=0.0,
            carbs_g=0.0,
            fat_g=0.0,
            fiber_g=0.0,
            sugar_g=0.0,
            sodium_mg=0.0,
            potassium_mg=0.0,
            calcium_mg=0.0,
            iron_mg=0.0,
            vitamin_c_mg=0.0,
            saturated_fat_g=0.0,
            serving_weight_g=100.0,
            glycemic_index=None,
            health_score=0,
            tags=[],
            source="USDA / ICMR-NIN Verified DB",
            found=False,
            matched_food=None,
            suggestions=suggestions,
        )

    serving_weight = data.get("serving_weight_g", 100.0)
    scale = calculate_unit_scale(qty, unit, serving_weight)

    return NutritionData(
        food_item=matched_key.title(),
        quantity=qty,
        unit=unit,
        calories=round(data["calories"] * scale, 1),
        protein_g=round(data["protein_g"] * scale, 1),
        carbs_g=round(data["carbs_g"] * scale, 1),
        fat_g=round(data["fat_g"] * scale, 1),
        fiber_g=round(data.get("fiber_g", 0) * scale, 1),
        sugar_g=round(data.get("sugar_g", 0) * scale, 1),
        sodium_mg=round(data.get("sodium_mg", 0) * scale, 1),
        potassium_mg=round(data.get("potassium_mg", 0) * scale, 1),
        calcium_mg=round(data.get("calcium_mg", 0) * scale, 1),
        iron_mg=round(data.get("iron_mg", 0) * scale, 1),
        vitamin_c_mg=round(data.get("vitamin_c_mg", 0) * scale, 1),
        saturated_fat_g=round(data.get("saturated_fat_g", 0) * scale, 1),
        serving_weight_g=round(serving_weight * (qty if unit in ['serving', 'pcs', 'piece', 'item', 'slice', 'scoop'] else 1.0), 1),
        glycemic_index=data.get("gi"),
        health_score=data.get("health_score", 85),
        tags=data.get("tags", []),
        source="USDA / ICMR-NIN Verified DB",
        found=True,
        matched_food=matched_key,
        suggestions=[],
    )
