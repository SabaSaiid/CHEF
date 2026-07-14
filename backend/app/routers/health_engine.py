"""
Health Conditions Engine — evidence-based nutritional adjustments.

Applies medical-grade macro/micro overrides based on diagnosed health
conditions.  Every rule is sourced from peer-reviewed clinical guidelines.

Sources:
  • ADA Standards of Medical Care in Diabetes (2024)
  • AHA/ACC Guideline on Management of Blood Cholesterol (2018)
  • DASH Diet — NIH/NHLBI
  • KDOQI Clinical Practice Guidelines for CKD Nutrition (2020)
  • Endocrine Society PCOS Guidelines (2023)
  • WHO Anaemia Guidelines (2023)
  • ATA Guidelines for Hypothyroidism (2014)

IMPORTANT: This engine provides general dietary guidelines for wellness.
It is NOT a substitute for professional medical advice.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class HealthAdjustment:
    """Result container for adjusted nutritional targets."""
    # Adjusted macro targets (None means "keep original")
    target_calories: Optional[int] = None
    target_protein: Optional[int] = None
    target_carbs: Optional[int] = None
    target_fat: Optional[int] = None
    target_fiber_g: Optional[int] = None
    target_water_ml: Optional[int] = None

    # Ingredient flags for recipe filtering
    avoid_ingredients: list[str] = field(default_factory=list)
    prefer_ingredients: list[str] = field(default_factory=list)

    # Human-readable notes explaining adjustments
    notes: list[str] = field(default_factory=list)

    # Max per-meal constraints
    max_carbs_pct: Optional[int] = None    # Max % of calories from carbs
    max_fat_pct: Optional[int] = None      # Max % of calories from fat
    max_protein_per_kg: Optional[float] = None  # Cap protein g/kg


# ── Ingredient blacklists for conditions ────────────────────────────────

HIGH_SODIUM_INGREDIENTS = {
    "pickle", "pickled", "soy sauce", "miso", "kimchi", "bacon",
    "sausage", "salami", "ham", "canned", "chips", "papad",
    "processed cheese", "instant noodle", "ramen", "bouillon",
    "anchovy", "olive brine", "capers", "worcestershire",
}

HIGH_SUGAR_INGREDIENTS = {
    "sugar", "jaggery", "honey", "maple syrup", "condensed milk",
    "chocolate", "candy", "cake", "pastry", "cookie", "brownie",
    "ice cream", "fudge", "caramel", "syrup", "jam", "jelly",
    "sweetened", "gulab jamun", "rasgulla", "ladoo", "halwa",
    "barfi", "kheer", "payasam",
}

HIGH_CHOLESTEROL_INGREDIENTS = {
    "butter", "ghee", "cream", "lard", "shortening", "coconut oil",
    "palm oil", "bacon", "sausage", "liver", "organ meat",
    "fried", "deep fried", "battered",
}

HIGH_POTASSIUM_INGREDIENTS = {
    "banana", "potato", "sweet potato", "spinach", "avocado",
    "tomato sauce", "orange juice", "dried fruit", "beans",
    "lentils", "nuts", "coconut water",
}

GOITROGEN_INGREDIENTS = {
    "cabbage", "broccoli", "cauliflower", "kale", "brussels sprouts",
    "bok choy", "turnip", "soy", "tofu", "tempeh", "edamame",
    "millet", "cassava",
}

IRON_RICH_INGREDIENTS = {
    "spinach", "lentils", "chickpea", "kidney beans", "red meat",
    "beef", "lamb", "liver", "tofu", "quinoa", "pumpkin seeds",
    "dark chocolate", "fortified cereal",
}

ANTI_INFLAMMATORY_INGREDIENTS = {
    "turmeric", "ginger", "salmon", "sardine", "mackerel",
    "olive oil", "berries", "leafy greens", "nuts", "seeds",
    "tomato", "green tea",
}

SPICY_INDICATORS = {
    "chili", "chilli", "pepper", "jalapeño", "jalapeno", "habanero",
    "cayenne", "sriracha", "hot sauce", "wasabi", "mustard",
    "garam masala", "red chili", "green chili", "spicy",
    "tikka", "vindaloo", "schezwan",
}

SWEET_INDICATORS = {
    "sugar", "honey", "maple", "sweet", "chocolate", "caramel",
    "vanilla", "cinnamon", "dessert", "cake", "cookie",
    "fruit", "banana", "mango", "berry",
}

TANGY_INDICATORS = {
    "lemon", "lime", "tamarind", "vinegar", "yogurt", "curd",
    "tomato", "amchur", "kokum", "raw mango", "citrus",
    "sour cream",
}

SMOKY_INDICATORS = {
    "smoky", "smoked", "barbecue", "bbq", "grilled", "charcoal",
    "tandoori", "roasted", "charred",
}


def _parse_conditions(conditions_str: Optional[str]) -> list[str]:
    """Parse comma-separated conditions string into a clean list."""
    if not conditions_str:
        return []
    return [c.strip().lower() for c in conditions_str.split(",") if c.strip()]


def apply_health_adjustments(
    base_calories: int,
    base_protein: int,
    base_carbs: int,
    base_fat: int,
    base_fiber: int,
    base_water: int,
    weight_kg: float,
    health_conditions_str: Optional[str] = None,
) -> HealthAdjustment:
    """
    Apply evidence-based nutritional adjustments for health conditions.

    Takes the base TDEE-calculated targets and returns an adjusted set.
    Multiple conditions stack — e.g. diabetes + hypertension will combine
    carb caps AND sodium restrictions.
    """
    conditions = _parse_conditions(health_conditions_str)
    if not conditions:
        return HealthAdjustment()  # No adjustments

    adj = HealthAdjustment(
        target_calories=base_calories,
        target_protein=base_protein,
        target_carbs=base_carbs,
        target_fat=base_fat,
        target_fiber_g=base_fiber,
        target_water_ml=base_water,
    )

    for condition in conditions:
        if condition == "diabetes":
            _apply_diabetes(adj, base_calories, weight_kg)
        elif condition == "hypertension":
            _apply_hypertension(adj, base_calories)
        elif condition == "hypotension":
            _apply_hypotension(adj, base_calories)
        elif condition == "high_cholesterol":
            _apply_high_cholesterol(adj, base_calories)
        elif condition == "pcos":
            _apply_pcos(adj, base_calories, weight_kg)
        elif condition == "kidney_disease":
            _apply_kidney_disease(adj, base_calories, weight_kg)
        elif condition == "thyroid":
            _apply_thyroid(adj)
        elif condition == "anemia":
            _apply_anemia(adj)

    return adj


# ── Condition-specific adjustment functions ─────────────────────────────

def _apply_diabetes(adj: HealthAdjustment, calories: int, weight_kg: float):
    """
    ADA Standards of Care 2024:
    - No single ideal carb intake; recommend 45% max for Type 2
    - Emphasize fiber ≥30g/day
    - Prefer low-glycemic-index foods
    - Avoid added sugars
    """
    max_carb_cals = calories * 0.45
    max_carbs_g = int(round(max_carb_cals / 4))
    if adj.target_carbs and adj.target_carbs > max_carbs_g:
        adj.target_carbs = max_carbs_g
        # Redistribute excess carb calories to protein
        excess_cals = (adj.target_carbs - max_carbs_g) * 4
        adj.target_protein = (adj.target_protein or 0) + int(round(excess_cals / 4))

    adj.target_fiber_g = max(adj.target_fiber_g or 25, 30)
    adj.max_carbs_pct = 45

    adj.avoid_ingredients.extend(HIGH_SUGAR_INGREDIENTS)
    adj.prefer_ingredients.extend(["oats", "quinoa", "barley", "lentils", "leafy greens"])

    adj.notes.append(
        "Diabetes: Carbs capped at 45% of calories (ADA 2024). "
        "Fiber raised to ≥30g. High-sugar foods excluded."
    )


def _apply_hypertension(adj: HealthAdjustment, calories: int):
    """
    AHA/ACC + DASH Diet Guidelines:
    - Sodium <2300mg/day (ideally <1500mg)
    - Increase potassium-rich foods
    - Fat ≤27% of calories
    - Emphasize whole grains, fruits, vegetables
    """
    max_fat_cals = calories * 0.27
    max_fat_g = int(round(max_fat_cals / 9))
    if adj.target_fat and adj.target_fat > max_fat_g:
        adj.target_fat = max_fat_g

    adj.max_fat_pct = 27
    adj.target_fiber_g = max(adj.target_fiber_g or 25, 30)

    adj.avoid_ingredients.extend(HIGH_SODIUM_INGREDIENTS)
    adj.prefer_ingredients.extend([
        "banana", "spinach", "sweet potato", "yogurt",
        "oats", "brown rice", "salmon", "nuts",
    ])

    adj.notes.append(
        "Hypertension: Following DASH diet — fat ≤27%, "
        "high-sodium foods excluded, potassium-rich foods prioritized."
    )


def _apply_hypotension(adj: HealthAdjustment, calories: int):
    """
    Clinical guidelines for chronic hypotension:
    - Slightly higher sodium intake allowed
    - Increased fluid intake (+500ml)
    - Small, frequent meals preferred
    - Avoid large carb-heavy meals
    """
    adj.target_water_ml = (adj.target_water_ml or 2500) + 500

    adj.prefer_ingredients.extend([
        "salt", "olive", "cheese", "nuts", "eggs",
        "electrolyte", "broth",
    ])

    adj.notes.append(
        "Hypotension: Water target increased by 500ml. "
        "Moderate sodium intake allowed. Small frequent meals recommended."
    )


def _apply_high_cholesterol(adj: HealthAdjustment, calories: int):
    """
    ATP III / AHA Guidelines:
    - Saturated fat <7% of calories
    - Total fat 25-35% (we use ≤25%)
    - Fiber ≥25g/day (soluble fiber especially)
    - Emphasize omega-3 fatty acids
    """
    max_fat_cals = calories * 0.25
    max_fat_g = int(round(max_fat_cals / 9))
    if adj.target_fat and adj.target_fat > max_fat_g:
        adj.target_fat = max_fat_g

    adj.max_fat_pct = 25
    adj.target_fiber_g = max(adj.target_fiber_g or 25, 25)

    adj.avoid_ingredients.extend(HIGH_CHOLESTEROL_INGREDIENTS)
    adj.prefer_ingredients.extend([
        "oats", "salmon", "sardine", "flaxseed", "walnuts",
        "olive oil", "avocado", "beans", "lentils",
    ])

    adj.notes.append(
        "High Cholesterol: Fat capped at 25% (ATP III). "
        "Saturated fat sources excluded, omega-3 rich foods prioritized."
    )


def _apply_pcos(adj: HealthAdjustment, calories: int, weight_kg: float):
    """
    Endocrine Society 2023:
    - Low-glycemic-index carbs
    - Protein ≥25% of calories
    - Anti-inflammatory foods
    - Moderate caloric deficit if overweight
    """
    min_protein_cals = calories * 0.25
    min_protein_g = int(round(min_protein_cals / 4))
    if adj.target_protein and adj.target_protein < min_protein_g:
        adj.target_protein = min_protein_g

    # Cap carbs at 40%
    max_carb_cals = calories * 0.40
    max_carbs_g = int(round(max_carb_cals / 4))
    if adj.target_carbs and adj.target_carbs > max_carbs_g:
        adj.target_carbs = max_carbs_g

    adj.max_carbs_pct = 40

    adj.avoid_ingredients.extend(HIGH_SUGAR_INGREDIENTS)
    adj.prefer_ingredients.extend(ANTI_INFLAMMATORY_INGREDIENTS)

    adj.notes.append(
        "PCOS: Protein raised to ≥25%, carbs capped at 40% (Endocrine Society 2023). "
        "Anti-inflammatory and low-GI foods prioritized."
    )


def _apply_kidney_disease(adj: HealthAdjustment, calories: int, weight_kg: float):
    """
    KDOQI 2020 Guidelines for CKD (non-dialysis):
    - Protein capped at 0.6–0.8 g/kg/day
    - Potassium restriction
    - Phosphorus restriction (dairy, nuts, cola)
    """
    max_protein = int(round(0.8 * weight_kg))
    adj.target_protein = min(adj.target_protein or max_protein, max_protein)
    adj.max_protein_per_kg = 0.8

    adj.avoid_ingredients.extend(HIGH_POTASSIUM_INGREDIENTS)
    adj.avoid_ingredients.extend(["cola", "cheese", "milk", "yogurt", "nuts", "seeds"])

    adj.notes.append(
        "Kidney Disease: Protein capped at 0.8g/kg (KDOQI 2020). "
        "High-potassium and high-phosphorus foods restricted."
    )


def _apply_thyroid(adj: HealthAdjustment):
    """
    ATA Guidelines for Hypothyroidism:
    - Ensure adequate iodine and selenium
    - Limit excessive goitrogen consumption
    - Adequate fiber for metabolic support
    """
    adj.target_fiber_g = max(adj.target_fiber_g or 25, 28)

    adj.avoid_ingredients.extend(GOITROGEN_INGREDIENTS)
    adj.prefer_ingredients.extend([
        "iodized salt", "seaweed", "fish", "shellfish",
        "brazil nuts", "eggs", "dairy",
    ])

    adj.notes.append(
        "Thyroid: Goitrogenic foods limited, iodine/selenium-rich foods prioritized (ATA). "
        "Fiber raised for metabolic support."
    )


def _apply_anemia(adj: HealthAdjustment):
    """
    WHO Anaemia Guidelines 2023:
    - Increase iron-rich foods
    - Pair with vitamin C for absorption
    - Avoid tea/coffee with meals (tannins block iron)
    """
    adj.prefer_ingredients.extend(IRON_RICH_INGREDIENTS)
    adj.prefer_ingredients.extend(["lemon", "orange", "bell pepper", "tomato"])

    adj.avoid_ingredients.extend(["tea", "coffee"])

    adj.notes.append(
        "Anemia: Iron-rich foods and vitamin C sources prioritized (WHO 2023). "
        "Tea/coffee with meals should be avoided (tannins inhibit iron absorption)."
    )


# ── Taste preference scoring ───────────────────────────────────────────

def score_recipe_taste(
    recipe_title: str,
    recipe_ingredients: list[str],
    taste_preferences_str: Optional[str] = None,
) -> float:
    """
    Score a recipe 0.0–1.0 based on how well it matches user taste preferences.
    Returns 0.5 (neutral) if no preferences are set.
    """
    if not taste_preferences_str:
        return 0.5

    prefs = _parse_conditions(taste_preferences_str)
    if not prefs:
        return 0.5

    searchable = (recipe_title + " " + " ".join(recipe_ingredients)).lower()
    score = 0.0
    max_score = len(prefs)

    for pref in prefs:
        indicators = set()
        if pref == "spicy":
            indicators = SPICY_INDICATORS
        elif pref == "mild":
            # Mild = absence of spicy indicators
            if not any(s in searchable for s in SPICY_INDICATORS):
                score += 1.0
            continue
        elif pref == "sweet":
            indicators = SWEET_INDICATORS
        elif pref == "savory":
            # Savory = has savory ingredients and not dessert-like
            savory_words = {"garlic", "onion", "pepper", "salt", "herb", "broth", "curry", "masala"}
            if any(s in searchable for s in savory_words):
                score += 1.0
            continue
        elif pref == "tangy":
            indicators = TANGY_INDICATORS
        elif pref == "smoky":
            indicators = SMOKY_INDICATORS

        if indicators and any(ind in searchable for ind in indicators):
            score += 1.0

    return round(score / max_score, 2) if max_score > 0 else 0.5


def has_avoided_ingredient(
    recipe_ingredients: list[str],
    avoid_list: list[str],
) -> bool:
    """Check if any recipe ingredient matches the avoid list."""
    if not avoid_list:
        return False

    avoid_set = set(avoid_list)
    for ing in recipe_ingredients:
        ing_lower = ing.lower().strip()
        for avoided in avoid_set:
            if avoided in ing_lower:
                return True
    return False
