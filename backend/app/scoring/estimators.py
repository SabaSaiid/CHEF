"""
Estimators for CHEF Score computation.

Provides heuristic estimation for:
  1. Fruit / Vegetable / Legume / Nut percentage (FVL%)
  2. Per-100g nutrition normalization from per-serving data
  3. Missing micronutrient gap-filling from ingredient-level aggregation
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

from app.scoring.constants import (
    DEFAULT_NUTRIENTS_PER_100G,
    FALLBACK_SERVING_WEIGHT_G,
)


# ── Load FVL taxonomy ───────────────────────────────────────────────────

_FVL_PATH = Path(__file__).parent / "fvl_taxonomy.json"
_FVL_DATA: dict[str, list[str]] = {}

if _FVL_PATH.exists():
    with open(_FVL_PATH, encoding="utf-8") as _f:
        _FVL_DATA = json.load(_f)

# Build a flat lookup: ingredient_keyword → category
_FVL_LOOKUP: dict[str, str] = {}
for _category, _items in _FVL_DATA.items():
    for _item in _items:
        _FVL_LOOKUP[_item.lower()] = _category


# ── Load nutrition database for ingredient-level enrichment ─────────────

_NUTRITION_DB_PATH = Path(__file__).parent.parent / "nutrition_extra.json"
_NUTRITION_DB: dict[str, dict] = {}

if _NUTRITION_DB_PATH.exists():
    with open(_NUTRITION_DB_PATH, encoding="utf-8") as _f:
        _NUTRITION_DB = json.load(_f)


# ── Quantity parsing from ingredient strings ────────────────────────────

_QTY_PATTERN = re.compile(
    r"^([\d¼½¾⅓⅔⅛⅜⅝⅞./]+)\s*"
    r"(cup|cups|tbsp|tablespoon|tsp|teaspoon|g|grams?|kg|ml|l|liter|liters?"
    r"|oz|ounce|ounces?|lb|lbs?|pound|pounds?|piece|pieces|pcs|medium|large|small"
    r"|cloves?|bunch|bunches|slices?|stalks?|heads?|sprigs?)?\s+(.+)",
    re.IGNORECASE,
)

_UNICODE_FRACTIONS = {
    "¼": 0.25, "½": 0.5, "¾": 0.75,
    "⅓": 0.333, "⅔": 0.667,
    "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
}

_UNIT_TO_GRAMS = {
    "cup": 240, "cups": 240,
    "tbsp": 15, "tablespoon": 15, "tablespoons": 15,
    "tsp": 5, "teaspoon": 5, "teaspoons": 5,
    "g": 1, "gram": 1, "grams": 1,
    "kg": 1000,
    "ml": 1, "l": 1000, "liter": 1000, "liters": 1000,
    "oz": 28.35, "ounce": 28.35, "ounces": 28.35,
    "lb": 453.6, "lbs": 453.6, "pound": 453.6, "pounds": 453.6,
    "piece": 100, "pieces": 100, "pcs": 100,
    "medium": 120, "large": 170, "small": 80,
    "clove": 5, "cloves": 5,
    "bunch": 50, "bunches": 50,
    "slice": 30, "slices": 30,
    "stalk": 60, "stalks": 60,
    "head": 400, "heads": 400,
    "sprig": 2, "sprigs": 2,
}


def _parse_fraction(s: str) -> float:
    """Parse a numeric string that may contain Unicode fractions or slash notation."""
    s = s.strip()
    if not s:
        return 1.0

    # Check unicode fractions
    for frac_char, frac_val in _UNICODE_FRACTIONS.items():
        if frac_char in s:
            parts = s.split(frac_char)
            whole = float(parts[0]) if parts[0].strip() else 0
            return whole + frac_val

    # Check slash fractions like "1/2"
    if "/" in s:
        parts = s.split("/")
        try:
            return float(parts[0]) / float(parts[1])
        except (ValueError, ZeroDivisionError):
            return 1.0

    try:
        return float(s)
    except ValueError:
        return 1.0


def _parse_ingredient_weight(ingredient_str: str) -> tuple[str, float]:
    """
    Parse an ingredient string and estimate its weight in grams.

    Returns:
        (ingredient_name, estimated_weight_g)
    """
    ingredient_str = ingredient_str.strip()

    # Try to match quantity + unit + name pattern
    m = _QTY_PATTERN.match(ingredient_str)
    if m:
        qty = _parse_fraction(m.group(1))
        unit = (m.group(2) or "").lower().strip()
        name = m.group(3).strip()

        grams_per_unit = _UNIT_TO_GRAMS.get(unit, 100)
        return name.lower(), qty * grams_per_unit

    # Fallback: try to extract just the name, assume ~100g
    # Remove leading numbers and common words
    cleaned = re.sub(r"^[\d¼½¾⅓⅔⅛⅜⅝⅞./\s]+", "", ingredient_str)
    cleaned = re.sub(
        r"^(to taste|as needed|for garnish|optional|a pinch of|pinch)\s*",
        "", cleaned, flags=re.I,
    )
    if not cleaned:
        cleaned = ingredient_str

    return cleaned.lower().strip(), 100.0


def _classify_ingredient(name: str) -> Optional[str]:
    """
    Classify an ingredient as fruit/vegetable/legume/nut or None.

    Uses multi-strategy matching:
      1. Exact match
      2. Substring containment (ingredient name contains a known FVL term)
    """
    name_lower = name.lower().strip()

    # Exact match
    if name_lower in _FVL_LOOKUP:
        return _FVL_LOOKUP[name_lower]

    # Substring match: check if any FVL keyword appears in the ingredient name
    for keyword, category in _FVL_LOOKUP.items():
        if len(keyword) >= 3 and keyword in name_lower:
            return category

    return None


# ── Public API ──────────────────────────────────────────────────────────

def estimate_fvl_percent(ingredients: list[str]) -> float:
    """
    Estimate the fruit/vegetable/legume/nut percentage of a recipe.

    Args:
        ingredients: List of raw ingredient strings (e.g., "2 cups spinach").

    Returns:
        Estimated FVL percentage (0.0 – 100.0).
    """
    if not ingredients:
        return 0.0

    total_weight = 0.0
    fvl_weight = 0.0

    for ing_str in ingredients:
        name, weight_g = _parse_ingredient_weight(ing_str)
        total_weight += weight_g

        category = _classify_ingredient(name)
        if category in ("fruit", "vegetable", "legume", "nut"):
            fvl_weight += weight_g

    if total_weight <= 0:
        return 0.0

    return round(min(100.0, (fvl_weight / total_weight) * 100), 1)


def estimate_serving_weight_g(
    ingredients: list[str],
    servings: int = 1,
    meal_type: str | None = None,
) -> float:
    """
    Estimate the weight of a single serving in grams.

    Attempts to sum ingredient weights and divide by servings.
    Falls back to category-based defaults.

    Args:
        ingredients: List of raw ingredient strings.
        servings: Number of servings the recipe makes.
        meal_type: Optional meal type for better fallback estimation.

    Returns:
        Estimated weight per serving in grams.
    """
    if not ingredients:
        return _get_fallback_weight(meal_type)

    total_weight = 0.0
    for ing_str in ingredients:
        _, weight_g = _parse_ingredient_weight(ing_str)
        total_weight += weight_g

    if total_weight <= 0:
        return _get_fallback_weight(meal_type)

    weight_per_serving = total_weight / max(1, servings)

    # Sanity bounds: a serving shouldn't be < 50g or > 1500g
    weight_per_serving = max(50.0, min(1500.0, weight_per_serving))

    return round(weight_per_serving, 1)


def normalize_to_per_100g(
    nutrition: dict[str, float],
    serving_weight_g: float,
) -> dict[str, float]:
    """
    Convert per-serving nutrition to per-100g values.

    Args:
        nutrition: Dict with keys like "calories", "protein_g", etc.
                   Values are per-serving.
        serving_weight_g: Estimated weight of one serving in grams.

    Returns:
        Dict with same keys but values normalized to per-100g.
    """
    if serving_weight_g <= 0:
        serving_weight_g = 300.0  # safety fallback

    factor = 100.0 / serving_weight_g
    return {k: round(v * factor, 2) for k, v in nutrition.items()}


def enrich_missing_nutrients(
    nutrition_per_100g: dict[str, float],
    ingredients: list[str],
) -> dict[str, float]:
    """
    Fill in missing micronutrient data using ingredient-level aggregation
    from the nutrition database, with penalty-biased defaults as final fallback.

    Args:
        nutrition_per_100g: Partially complete per-100g nutrition dict.
        ingredients: List of raw ingredient strings.

    Returns:
        Enriched nutrition dict with all fields needed for scoring.
    """
    result = dict(nutrition_per_100g)

    # Fields we need for scoring
    needed_fields = {
        "saturated_fat_g": "saturated_fat_g",
        "sugar_g": "sugar_g",
        "sodium_mg": "sodium_mg",
        "fiber_g": "fiber_g",
    }

    missing_fields = [
        (score_key, db_key)
        for score_key, db_key in needed_fields.items()
        if score_key not in result or result.get(score_key) is None
    ]

    if not missing_fields:
        return result

    # Try ingredient-level aggregation
    if ingredients:
        aggregated = _aggregate_from_ingredients(ingredients, [k for k, _ in missing_fields])
        for score_key, _ in missing_fields:
            if score_key in aggregated and aggregated[score_key] is not None:
                result[score_key] = aggregated[score_key]

    # Fill remaining gaps with conservative defaults
    for score_key, _ in missing_fields:
        if score_key not in result or result.get(score_key) is None:
            result[score_key] = DEFAULT_NUTRIENTS_PER_100G.get(score_key, 0.0)

    return result


def _aggregate_from_ingredients(
    ingredients: list[str],
    needed_fields: list[str],
) -> dict[str, float | None]:
    """
    Aggregate per-100g nutrient values from ingredient-level lookups.

    Parses each ingredient → matches to nutrition DB → scales by weight →
    sums and normalizes to per-100g of total recipe weight.
    """
    total_weight = 0.0
    field_totals: dict[str, float] = {f: 0.0 for f in needed_fields}
    matched_any = False

    for ing_str in ingredients:
        name, weight_g = _parse_ingredient_weight(ing_str)
        total_weight += weight_g

        # Look up in nutrition DB
        db_entry = _lookup_nutrition_db(name)
        if db_entry is None:
            continue

        matched_any = True
        scale = weight_g / 100.0  # DB values are per 100g
        for field in needed_fields:
            if field in db_entry:
                field_totals[field] += db_entry[field] * scale

    if not matched_any or total_weight <= 0:
        return {f: None for f in needed_fields}

    # Normalize back to per-100g of total recipe
    factor = 100.0 / total_weight
    return {f: round(field_totals[f] * factor, 2) for f in needed_fields}


def _lookup_nutrition_db(ingredient_name: str) -> dict | None:
    """Look up an ingredient in the nutrition database with fuzzy matching."""
    name = ingredient_name.lower().strip()

    # Exact match
    if name in _NUTRITION_DB:
        return _NUTRITION_DB[name]

    # Try removing common modifiers
    modifiers = {
        "fresh", "raw", "cooked", "boiled", "grilled", "baked", "fried",
        "chopped", "diced", "sliced", "minced", "crushed", "powder",
        "ground", "dried", "frozen", "canned", "organic",
    }
    tokens = name.split()
    cleaned = " ".join(t for t in tokens if t not in modifiers)
    if cleaned and cleaned in _NUTRITION_DB:
        return _NUTRITION_DB[cleaned]

    # Substring match: find DB keys contained in the ingredient name
    for db_key in _NUTRITION_DB:
        if len(db_key) >= 3 and db_key in name:
            return _NUTRITION_DB[db_key]

    # Reverse substring: ingredient name contained in a DB key
    for db_key in _NUTRITION_DB:
        if len(name) >= 3 and name in db_key:
            return _NUTRITION_DB[db_key]

    return None


def _get_fallback_weight(meal_type: str | None) -> float:
    """Get fallback serving weight based on meal type."""
    if not meal_type:
        return FALLBACK_SERVING_WEIGHT_G["default"]

    mt = meal_type.lower()
    if "snack" in mt or "dessert" in mt:
        return FALLBACK_SERVING_WEIGHT_G["snack"]
    if "drink" in mt or "beverage" in mt:
        return FALLBACK_SERVING_WEIGHT_G["beverage"]
    return FALLBACK_SERVING_WEIGHT_G["main"]
