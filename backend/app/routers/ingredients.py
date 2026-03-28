"""
Ingredient parsing router — rule-based regex parser.
Extracts ingredient names, quantities, and units from natural language text.
"""

import re
from fastapi import APIRouter
from app.schemas import IngredientParseRequest, IngredientParseResult, IngredientItem

router = APIRouter(prefix="/api/ingredients", tags=["ingredients"])

# Common cooking units for regex matching
UNITS = (
    r"cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|"
    r"kg|grams?|g|ml|liters?|l|pinch(?:es)?|dash(?:es)?|"
    r"cans?|bottles?|packages?|slices?|pieces?|cloves?|stalks?|heads?|"
    r"bunch(?:es)?|sprigs?|handfuls?"
)

# Pattern: optional quantity, optional unit, then the ingredient name
INGREDIENT_PATTERN = re.compile(
    rf"^\s*"
    rf"(?P<qty>\d+(?:[./]\d+)?(?:\s*-\s*\d+(?:[./]\d+)?)?)?\s*"
    rf"(?P<unit>{UNITS})?\s*"
    rf"(?:of\s+)?"
    rf"(?P<name>.+?)\s*$",
    re.IGNORECASE,
)


def _parse_quantity(raw: str) -> float | None:
    """Parse a quantity string like '2', '1/2', '1.5', '1-2' into a float."""
    if not raw:
        return None
    raw = raw.strip()
    # Range like "1-2" → take the average
    if "-" in raw:
        parts = raw.split("-")
        try:
            return (float(parts[0]) + float(parts[1])) / 2
        except ValueError:
            return None
    # Fraction like "1/2"
    if "/" in raw:
        parts = raw.split("/")
        try:
            return float(parts[0]) / float(parts[1])
        except (ValueError, ZeroDivisionError):
            return None
    try:
        return float(raw)
    except ValueError:
        return None


def parse_ingredient_line(line: str) -> IngredientItem:
    """Parse a single ingredient line into an IngredientItem."""
    line = line.strip()
    if not line:
        return IngredientItem(name="unknown", raw_text=line)

    match = INGREDIENT_PATTERN.match(line)
    if match:
        qty_str = match.group("qty")
        unit = match.group("unit")
        name = match.group("name").strip().rstrip(",;.")
        return IngredientItem(
            name=name if name else line,
            quantity=_parse_quantity(qty_str),
            unit=unit.lower() if unit else None,
            raw_text=line,
        )

    # Fallback: treat the whole line as the ingredient name
    return IngredientItem(name=line, raw_text=line)


def split_ingredient_text(text: str) -> list[str]:
    """Split raw text into individual ingredient lines."""
    # Split on newlines, commas, semicolons, or "and"
    lines = re.split(r"[,;\n]+|\band\b", text)
    return [line.strip() for line in lines if line.strip()]


@router.post("/parse", response_model=IngredientParseResult)
def parse_ingredients(req: IngredientParseRequest):
    """
    Parse natural language ingredient text into structured items.
    Uses rule-based regex parsing (no ML, no external API).

    Examples:
      "2 cups flour, 3 eggs, 1 lb chicken breast"
      "tomatoes, onion, garlic, olive oil"
    """
    lines = split_ingredient_text(req.text)
    items = [parse_ingredient_line(line) for line in lines]
    names = [item.name for item in items if item.name != "unknown"]

    return IngredientParseResult(
        original_text=req.text,
        ingredients=items,
        ingredient_names=names,
        parser="rule_based",
    )
