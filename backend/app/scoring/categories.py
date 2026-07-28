"""
Recipe category classifier for CHEF Score.

Determines whether a recipe should be scored using the "general",
"beverage", "fats_oils", or "cheese" threshold tables.

The vast majority of recipes will be classified as "general food".
The other categories are edge-case catches for recipes where
different Nutri-Score threshold tables apply.
"""

from __future__ import annotations

import re

# ── Keyword sets for category detection ─────────────────────────────────

_BEVERAGE_KEYWORDS: set[str] = {
    "smoothie", "juice", "shake", "tea", "coffee", "lassi", "sharbat",
    "drink", "lemonade", "cocktail", "buttermilk", "chaas", "nimbu pani",
    "sherbet", "milkshake", "latte", "cappuccino", "espresso", "matcha",
    "kombucha", "soda", "cola", "tonic", "aam panna", "jal jeera",
    "thandai", "agua fresca", "horchata", "frappe",
}

_CHEESE_KEYWORDS: set[str] = {
    "paneer", "cheese", "cheddar", "brie", "gouda", "parmesan",
    "mozzarella", "feta", "ricotta", "halloumi", "cottage cheese",
    "cream cheese", "swiss cheese", "blue cheese", "provolone",
    "gruyere", "camembert", "mascarpone",
}

# Recipes where cheese is the *main* component (not just an ingredient)
_CHEESE_DOMINANT_PATTERNS: list[re.Pattern] = [
    re.compile(r"\bcheese\s*(cake|ball|dip|spread|fondue|souffle)\b", re.I),
    re.compile(r"\bpaneer\s*(tikka|butter|bhurji|makhani)\b", re.I),
    re.compile(r"\bmac\s*(and|&|n)\s*cheese\b", re.I),
    re.compile(r"\bgrilled\s*cheese\b", re.I),
]

_FATS_OILS_KEYWORDS: set[str] = {
    "dressing", "vinaigrette", "sauce", "pesto", "chutney",
    "mayonnaise", "mayo", "aioli", "butter", "ghee", "hummus",
    "guacamole", "tahini", "nut butter", "peanut butter",
    "almond butter", "spread",
}

# Patterns where fats/oils dominate the recipe
_FATS_DOMINANT_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(salad\s*)?dressing\b", re.I),
    re.compile(r"\bpesto\b", re.I),
    re.compile(r"\bvinaigrette\b", re.I),
    re.compile(r"\b(herb|garlic|lemon)\s*butter\b", re.I),
]

# Words that indicate a recipe is NOT a beverage even if it contains
# beverage keywords (e.g., "smoothie bowl", "coffee cake")
_BEVERAGE_NEGATION: set[str] = {
    "bowl", "cake", "muffin", "bread", "pudding", "ice cream",
    "popsicle", "bar", "bites", "oats", "overnight",
}


def classify_recipe_category(
    title: str,
    ingredients: list[str] | None = None,
) -> str:
    """
    Classify a recipe into one of four Nutri-Score categories.

    Args:
        title: Recipe title string.
        ingredients: Optional list of ingredient strings for deeper analysis.

    Returns:
        One of: "general", "beverage", "fats_oils", "cheese".
    """
    title_lower = title.lower().strip()
    title_words = set(title_lower.split())
    ingredients_lower = " ".join(i.lower() for i in (ingredients or []))

    # ── Check for beverage ──────────────────────────────────────────
    if _is_beverage(title_lower, title_words, ingredients_lower):
        return "beverage"

    # ── Check for cheese-dominant ───────────────────────────────────
    if _is_cheese_dominant(title_lower, title_words, ingredients_lower):
        return "cheese"

    # ── Check for fats/oils/nuts/seeds-dominant ─────────────────────
    if _is_fats_dominant(title_lower, title_words, ingredients_lower):
        return "fats_oils"

    # ── Default ─────────────────────────────────────────────────────
    return "general"


def _is_beverage(title: str, title_words: set[str], ingredients: str) -> bool:
    """Check if recipe is a beverage."""
    # First check for negation words (e.g., "smoothie bowl" is NOT a beverage)
    if title_words & _BEVERAGE_NEGATION:
        return False

    # Check title for beverage keywords
    for keyword in _BEVERAGE_KEYWORDS:
        if keyword in title:
            return True

    return False


def _is_cheese_dominant(title: str, title_words: set[str], ingredients: str) -> bool:
    """Check if cheese is the primary component of the recipe."""
    # Check dominant patterns first (more specific)
    for pattern in _CHEESE_DOMINANT_PATTERNS:
        if pattern.search(title):
            return True

    # Simple title check — if the recipe IS cheese (not just contains it)
    # e.g., "Homemade Paneer" or "Fresh Mozzarella"
    if title_words & {"paneer", "cheese"} and len(title_words) <= 3:
        return True

    return False


def _is_fats_dominant(title: str, title_words: set[str], ingredients: str) -> bool:
    """Check if fats/oils/nuts/seeds dominate the recipe."""
    for pattern in _FATS_DOMINANT_PATTERNS:
        if pattern.search(title):
            return True

    # Check if title is purely a sauce/dressing/spread
    fat_title_words = title_words & _FATS_OILS_KEYWORDS
    if fat_title_words and len(title_words) <= 4:
        return True

    return False
