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
from fastapi import APIRouter, Query, HTTPException
from app.schemas import (
    NutritionRequest,
    NutritionData,
    NutriScoreCalculateRequest,
    NutriScoreResponse,
    RecipeCalculateRequest,
    RecipeCalculateResponse,
    RecipeCalculateIngredientItem,
    IngredientContribution,
)
from app.scoring.calculator import compute_nutri_score
from app.scoring.supplementary import compute_supplementary_badges

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


@router.post("/nutri-score/calculate", response_model=NutriScoreResponse, summary="Calculate full 6-tier Nutri-Score on demand")
def calculate_nutri_score_endpoint(req: NutriScoreCalculateRequest):
    """
    Calculate full 6-tier Nutri-Score (FSA-NPS 2023 revision) on the fly for
    custom nutrition values, servings, and ingredient lists.
    Returns complete breakdown, positive and negative component scores, next-tier progression, and actionable recommendations.
    """
    nutrition_dict = {
        "calories": req.calories,
        "protein_g": req.protein_g,
        "carbs_g": req.carbs_g,
        "fat_g": req.fat_g,
    }
    if req.fiber_g is not None:
        nutrition_dict["fiber_g"] = req.fiber_g
    if req.saturated_fat_g is not None:
        nutrition_dict["saturated_fat_g"] = req.saturated_fat_g
    if req.sugar_g is not None:
        nutrition_dict["sugar_g"] = req.sugar_g
    if req.sodium_mg is not None:
        nutrition_dict["sodium_mg"] = req.sodium_mg

    result = compute_nutri_score(
        nutrition=nutrition_dict,
        ingredients=req.ingredients,
        servings=req.servings or 1,
        title=req.title or "",
        meal_type=req.meal_type,
    )

    # Compute supplementary indicators
    supp = compute_supplementary_badges(
        nutrition=nutrition_dict,
        ingredients=req.ingredients,
    )

    res_dict = result.to_dict()
    res_dict["supplementary_badges"] = supp.to_dict()

    return NutriScoreResponse(**res_dict)


@router.post("/recipe/calculate", response_model=RecipeCalculateResponse, summary="Simulate & calculate dynamic recipe nutrition & Nutri-Score from custom ingredients")
def calculate_custom_recipe_endpoint(req: RecipeCalculateRequest):
    """
    Dynamically simulate and calculate the complete nutritional profile, macro percentages,
    per-ingredient breakdown, and 6-tier Nutri-Score for custom ingredient lists and quantities.
    Enables live interactive recipe tweaking (e.g. 250g -> 500g chicken, 1 -> 1.5 cups curd, salt reduction).
    """
    servings = max(0.25, float(req.servings or 1.0))
    contributions: list[IngredientContribution] = []

    total_cals = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    total_fiber = 0.0
    total_sugar = 0.0
    total_sodium = 0.0
    total_sat_fat = 0.0
    total_potassium = 0.0
    total_calcium = 0.0
    total_iron = 0.0
    total_vit_c = 0.0

    raw_ingredient_strings: list[str] = []

    for ing in req.ingredients:
        # Extract structured details
        if isinstance(ing, str):
            raw_str = ing.strip()
            if not raw_str:
                continue
            qty, unit, name = parse_quantity_unit(raw_str, 1.0, "serving")
            raw_ingredient_strings.append(raw_str)
        elif isinstance(ing, dict):
            qty = float(ing.get("qty", 1.0))
            unit = str(ing.get("unit", "g"))
            name = str(ing.get("name", "")).strip()
            raw_str = ing.get("raw") or f"{qty} {unit} {name}".strip()
            raw_ingredient_strings.append(raw_str)
        else:
            qty = float(ing.qty)
            unit = str(ing.unit)
            name = str(ing.name).strip()
            raw_str = ing.raw or f"{qty} {unit} {name}".strip()
            raw_ingredient_strings.append(raw_str)

        if not name:
            continue

        matched_key, data, _ = _smart_lookup(name)

        if data:
            serving_weight = data.get("serving_weight_g", 100.0)
            scale = calculate_unit_scale(qty, unit, serving_weight)
            weight_g = qty if unit.lower() in ['g', 'gram', 'grams', 'ml'] else (scale * 100.0)

            cals = round(data["calories"] * scale, 1)
            prot = round(data["protein_g"] * scale, 1)
            carbs = round(data["carbs_g"] * scale, 1)
            fat = round(data["fat_g"] * scale, 1)
            fib = round(data.get("fiber_g", 0.0) * scale, 1)
            sug = round(data.get("sugar_g", 0.0) * scale, 1)
            sod = round(data.get("sodium_mg", 0.0) * scale, 1)
            sat = round(data.get("saturated_fat_g", 0.0) * scale, 1)
            pot = round(data.get("potassium_mg", 0.0) * scale, 1)
            calc = round(data.get("calcium_mg", 0.0) * scale, 1)
            irn = round(data.get("iron_mg", 0.0) * scale, 1)
            vc = round(data.get("vitamin_c_mg", 0.0) * scale, 1)

            contributions.append(IngredientContribution(
                name=name.title(),
                quantity=qty,
                unit=unit,
                matched_food=matched_key,
                found=True,
                weight_g=round(weight_g, 1),
                calories=cals,
                protein_g=prot,
                carbs_g=carbs,
                fat_g=fat,
                fiber_g=fib,
                sugar_g=sug,
                sodium_mg=sod,
                saturated_fat_g=sat,
                confidence="high",
            ))

            total_cals += cals
            total_protein += prot
            total_carbs += carbs
            total_fat += fat
            total_fiber += fib
            total_sugar += sug
            total_sodium += sod
            total_sat_fat += sat
            total_potassium += pot
            total_calcium += calc
            total_iron += irn
            total_vit_c += vc
        else:
            # Smart culinary fallback for unlisted items (e.g. salt, spices, herbs, oil)
            lower_name = name.lower()
            scale = calculate_unit_scale(qty, unit, 10.0)
            weight_g = qty if unit.lower() in ['g', 'gram', 'grams'] else (scale * 10.0)

            cals = 0.0
            prot = 0.0
            carbs = 0.0
            fat = 0.0
            fib = 0.0
            sug = 0.0
            sod = 0.0
            sat = 0.0

            if 'salt' in lower_name:
                # 1g salt ~ 387mg sodium. 1 tsp salt = 5g = ~1935mg sodium
                sod = round(weight_g * 387.5, 1)
            elif 'oil' in lower_name or 'ghee' in lower_name or 'butter' in lower_name:
                cals = round(weight_g * 8.84, 1)
                fat = round(weight_g * 0.99, 1)
                sat = round(weight_g * (0.6 if 'ghee' in lower_name or 'butter' in lower_name else 0.15), 1)
            elif 'sugar' in lower_name or 'honey' in lower_name or 'jaggery' in lower_name:
                cals = round(weight_g * 3.87, 1)
                carbs = round(weight_g * 0.98, 1)
                sug = round(weight_g * 0.95, 1)
            elif 'chili' in lower_name or 'turmeric' in lower_name or 'cumin' in lower_name or 'coriander' in lower_name or 'masala' in lower_name or 'spice' in lower_name:
                cals = round(weight_g * 2.8, 1)
                carbs = round(weight_g * 0.5, 1)
                fib = round(weight_g * 0.25, 1)
                prot = round(weight_g * 0.1, 1)

            contributions.append(IngredientContribution(
                name=name.title(),
                quantity=qty,
                unit=unit,
                matched_food=None,
                found=False,
                weight_g=round(weight_g, 1),
                calories=cals,
                protein_g=prot,
                carbs_g=carbs,
                fat_g=fat,
                fiber_g=fib,
                sugar_g=sug,
                sodium_mg=sod,
                saturated_fat_g=sat,
                confidence="medium" if cals > 0 or sod > 0 else "low",
            ))

            total_cals += cals
            total_protein += prot
            total_carbs += carbs
            total_fat += fat
            total_fiber += fib
            total_sugar += sug
            total_sodium += sod
            total_sat_fat += sat

    # Compute per-serving values
    per_serving_cals = round(total_cals / servings, 1)
    per_serving_prot = round(total_protein / servings, 1)
    per_serving_carbs = round(total_carbs / servings, 1)
    per_serving_fat = round(total_fat / servings, 1)
    per_serving_fib = round(total_fiber / servings, 1)
    per_serving_sug = round(total_sugar / servings, 1)
    per_serving_sod = round(total_sodium / servings, 1)
    per_serving_sat = round(total_sat_fat / servings, 1)
    per_serving_pot = round(total_potassium / servings, 1)
    per_serving_calc = round(total_calcium / servings, 1)
    per_serving_irn = round(total_iron / servings, 1)
    per_serving_vc = round(total_vit_c / servings, 1)

    # Macro percentages via Largest Remainder Method
    p_cal = per_serving_prot * 4.0
    c_cal = per_serving_carbs * 4.0
    f_cal = per_serving_fat * 9.0
    macro_cal_total = p_cal + c_cal + f_cal

    macro_pcts = {"proteinPct": 0, "carbsPct": 0, "fatPct": 0}
    if macro_cal_total > 0:
        raw_pcts = [
            ("proteinPct", (p_cal / macro_cal_total) * 100),
            ("carbsPct", (c_cal / macro_cal_total) * 100),
            ("fatPct", (f_cal / macro_cal_total) * 100),
        ]
        floor_sum = sum(int(val) for _, val in raw_pcts)
        rem_order = sorted(raw_pcts, key=lambda x: x[1] - int(x[1]), reverse=True)
        deficit = min(100, max(0, 100 - floor_sum))
        for i, (k, val) in enumerate(rem_order):
            bonus = 1 if i < deficit else 0
            macro_pcts[k] = int(val) + bonus

    # Compute Nutri-Score on per-serving values
    nutrition_dict = {
        "calories": per_serving_cals,
        "protein_g": per_serving_prot,
        "carbs_g": per_serving_carbs,
        "fat_g": per_serving_fat,
        "fiber_g": per_serving_fib,
        "saturated_fat_g": per_serving_sat,
        "sugar_g": per_serving_sug,
        "sodium_mg": per_serving_sod,
    }

    nutri_score_result = compute_nutri_score(
        nutrition=nutrition_dict,
        ingredients=raw_ingredient_strings,
        servings=servings,
        title=req.title or "Custom Recipe",
        meal_type=req.meal_type,
    )

    supp_badges = compute_supplementary_badges(
        nutrition=nutrition_dict,
        ingredients=raw_ingredient_strings,
    )

    nutri_dict = nutri_score_result.to_dict()
    nutri_dict["supplementary_badges"] = supp_badges.to_dict()

    total_nutrition_obj = NutritionData(
        food_item=f"{req.title or 'Recipe'} (Total Batch)",
        quantity=servings,
        unit="servings",
        calories=round(total_cals, 1),
        protein_g=round(total_protein, 1),
        carbs_g=round(total_carbs, 1),
        fat_g=round(total_fat, 1),
        fiber_g=round(total_fiber, 1),
        sugar_g=round(total_sugar, 1),
        sodium_mg=round(total_sodium, 1),
        potassium_mg=round(total_potassium, 1),
        calcium_mg=round(total_calcium, 1),
        iron_mg=round(total_iron, 1),
        vitamin_c_mg=round(total_vit_c, 1),
        saturated_fat_g=round(total_sat_fat, 1),
        serving_weight_g=100.0 * servings,
        found=True,
    )

    per_serving_obj = NutritionData(
        food_item=f"{req.title or 'Recipe'} (Per Serving)",
        quantity=1.0,
        unit="serving",
        calories=per_serving_cals,
        protein_g=per_serving_prot,
        carbs_g=per_serving_carbs,
        fat_g=per_serving_fat,
        fiber_g=per_serving_fib,
        sugar_g=per_serving_sug,
        sodium_mg=per_serving_sod,
        potassium_mg=per_serving_pot,
        calcium_mg=per_serving_calc,
        iron_mg=per_serving_irn,
        vitamin_c_mg=per_serving_vc,
        saturated_fat_g=per_serving_sat,
        serving_weight_g=100.0,
        found=True,
    )

    return RecipeCalculateResponse(
        servings=servings,
        total_nutrition=total_nutrition_obj,
        per_serving_nutrition=per_serving_obj,
        macro_percentages=macro_pcts,
        nutri_score=NutriScoreResponse(**nutri_dict),
        supplementary_badges=supp_badges.to_dict() if hasattr(supp_badges, 'to_dict') else supp_badges,
        ingredient_contributions=contributions,
        is_customized=True,
    )

