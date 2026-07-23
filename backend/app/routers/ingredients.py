"""
Ingredient parsing router — rule-based regex parser.
Extracts ingredient names, quantities, and units from natural language text.
"""

import re
import json
import os
import httpx
import asyncio
import difflib
from pathlib import Path
from fastapi import APIRouter
from app.schemas import IngredientParseRequest, IngredientParseResult, IngredientItem, IngredientSubstitute

router = APIRouter(prefix="/api/ingredients", tags=["ingredients"])

# Common cooking units for regex matching
UNITS = (
    r"cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|"
    r"kg|grams?|g|ml|liters?|l|pinch(?:es)?|dash(?:es)?|"
    r"cans?|bottles?|packages?|slices?|pieces?|cloves?|stalks?|heads?|"
    r"bunch(?:es)?|sprigs?|handfuls?"
)

# Pattern: optional quantity (including mixed fractions and ranges), optional unit, then ingredient name
INGREDIENT_PATTERN = re.compile(
    rf"^\s*"
    rf"(?P<qty>(?:\d+(?:\s+\d+/\d+|\.\d+|/\d+)?|\d+/\d+)(?:\s*[-–]\s*(?:\d+(?:\s+\d+/\d+|\.\d+|/\d+)?|\d+/\d+))?)?\s*"
    rf"(?P<unit>{UNITS})?\s*"
    rf"(?:of\s+)?"
    rf"(?P<name>.+?)\s*$",
    re.IGNORECASE,
)

_DATA_FILE = Path(__file__).resolve().parent.parent / "substitutions.json"
_SUBSTITUTIONS = {}
if _DATA_FILE.exists():
    with open(_DATA_FILE, "r") as f:
        _SUBSTITUTIONS = json.load(f)

DESCRIPTORS = re.compile(
    r"\b("
    r"fresh|freshly|organic|raw|cold-pressed|extra-virgin|extra\s+virgin|"
    r"fine|finely|coarse|coarsely|dry|dried|ground|powdered|powder|"
    r"unsalted|salted|diced|chopped|minced|sliced|shredded|grated|"
    r"boneless|skinless|whole|crushed|pure|natural|virgin|light|dark|heavy|"
    r"sweet|bitter|wild|canned|frozen|cooked|roasted|toasted|fried|boiled"
    r")\b",
    re.IGNORECASE
)

def _extract_core_noun(name: str) -> str:
    text = re.sub(r'[^\w\s-]', '', name).strip().lower()
    text = DESCRIPTORS.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text if text else name.lower().strip()

def _normalize(text: str) -> str:
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    if text.endswith("oes"):
        return text[:-2]
    if text.endswith("s") and not text.endswith("ss"):
        return text[:-1]
    return text

def _classify_taxonomy(name: str) -> IngredientSubstitute | None:
    name_clean = name.lower().strip()

    # 1. Cooking Oils & Fats
    if re.search(r"\b(oil|ghee|butter|fat|lard|tallow)\b", name_clean):
        return IngredientSubstitute(
            healthy=["Avocado oil", "Olive oil"],
            vegan=["Coconut oil", "Vegetable oil", "Vegan butter"],
            general=["Ghee", "Peanut oil", "Canola oil", "Sesame oil"],
            notes=f"Substitutes for '{name}'. For high-heat frying or searing, use avocado oil or ghee. For raw dressings, use extra virgin olive oil."
        )

    # 2. Fresh Herbs & Leafy Greens
    if re.search(r"\b(leaf|leaves|greens|spinach|kale|methi|coriander|cilantro|parsley|basil|mint|dill|thyme|rosemary|chard|lettuce)\b", name_clean):
        return IngredientSubstitute(
            healthy=["Fresh baby spinach", "Fenugreek leaves (Methi)", "Kale"],
            general=["Flat-leaf parsley", "Fresh mint", "Italian seasoning"],
            notes=f"Substitutes for '{name}'. Fresh leafy herbs are best added at the end of cooking. Dried herbs are 3x more potent by volume."
        )

    # 3. Spices & Seasonings
    if re.search(r"\b(masala|powder|spice|chili|chillie|chile|pepper|peppercorn|cumin|turmeric|cardamom|clove|cinnamon|nutmeg|paprika|curry)\b", name_clean):
        return IngredientSubstitute(
            general=["Garam masala", "Curry powder", "Ground cumin + coriander blend", "Red pepper flakes"],
            notes=f"Spice substitute for '{name}'. Adjust quantities according to heat level preference."
        )

    # 4. Dairy, Curd & Creams
    if re.search(r"\b(milk|cream|curd|yogurt|cheese|paneer|malai|dahi|khoya|ricotta)\b", name_clean):
        return IngredientSubstitute(
            vegan=["Coconut milk / cream", "Cashew cream", "Silken tofu (blended)"],
            healthy=["Hung curd / Greek yogurt", "Low-fat cottage cheese"],
            general=["Evaporated milk", "Sour cream", "Paneer"],
            notes=f"Dairy substitute for '{name}'. When substituting yogurt or curd in hot curries, stir off the heat to prevent curdling."
        )

    # 5. Proteins, Meats & Fish
    if re.search(r"\b(chicken|mutton|lamb|beef|pork|fish|shrimp|prawn|salmon|tuna|egg|eggs|keema|sausage|bacon)\b", name_clean):
        return IngredientSubstitute(
            vegan=["Extra firm tofu", "Seitan", "Soya chunks", "Lentils", "King oyster mushrooms"],
            general=["Turkey breast", "Chicken thighs", "Paneer"],
            notes=f"Protein substitute for '{name}'. Plant proteins require generous marination to absorb rich savory flavors."
        )

    # 6. Flours, Grains & Starches
    if re.search(r"\b(flour|atta|maida|besan|sattu|suji|rawa|rice|starch|cornstarch|noodle|pasta|oat|grain)\b", name_clean):
        return IngredientSubstitute(
            gluten_free=["1:1 GF Flour blend", "Almond flour", "Oat flour", "Cornstarch"],
            healthy=["Whole wheat flour (Atta)", "Roasted besan", "Quinoa"],
            general=["All-purpose flour (Maida)", "Rice flour"],
            notes=f"Flour/grain substitute for '{name}'. Whole wheat absorbs more liquid than all-purpose flour; add 1-2 tbsp extra water if needed."
        )

    # 7. Sweeteners
    if re.search(r"\b(sugar|jaggery|gud|honey|syrup|misri|sweetener|stevia)\b", name_clean):
        return IngredientSubstitute(
            healthy=["Stevia", "Monk fruit sweetener", "Erythritol"],
            general=["Jaggery (Gud)", "Maple syrup", "Raw honey", "Coconut sugar"],
            notes=f"Sweetener substitute for '{name}'. Reduce other liquids in the recipe by 2 tbsp per cup if substituting with liquid honey/syrup."
        )

    # 8. Sour Acids & Citrus
    if re.search(r"\b(lemon|lime|tamarind|amchur|vinegar|kokum|mango|citrus)\b", name_clean):
        return IngredientSubstitute(
            healthy=["Fresh lemon juice", "Raw mango powder (Amchur)"],
            general=["Lime juice", "Tamarind paste", "Apple cider vinegar"],
            notes=f"Acid substitute for '{name}'. Amchur (dry mango powder) provides sourness without adding liquid volume to curries."
        )

    return None

def _adjust_for_recipe_context(sub: IngredientSubstitute, recipe_title: str | None) -> IngredientSubstitute:
    if not recipe_title or not sub:
        return sub
        
    title_clean = recipe_title.lower()
    
    if any(w in title_clean for w in ["cake", "muffin", "brownie", "cookie", "bread", "pancake", "waffle", "pie", "tart", "baking"]):
        if sub.baking:
            orig_notes = sub.notes or ""
            sub.notes = f"🍰 Baking Context ({recipe_title}): Recommended baking swap is {', '.join(sub.baking)}. {orig_notes}"
    elif any(w in title_clean for w in ["curry", "masala", "gravy", "stew", "soup", "dal", "biryani", "korma", "sabzi", "roti", "paratha"]):
        orig_notes = sub.notes or ""
        sub.notes = f"🥘 Savory Curry Context ({recipe_title}): {orig_notes}"
    elif any(w in title_clean for w in ["salad", "slaw", "dressing", "dip", "guacamole"]):
        orig_notes = sub.notes or ""
        sub.notes = f"🥗 Fresh Salad Context ({recipe_title}): Use fresh, uncooked substitute alternatives. {orig_notes}"
        
    return sub

async def _find_substitutes(name: str, recipe_title: str | None = None) -> IngredientSubstitute | None:
    name_lower = name.lower().strip()
    name_core = _extract_core_noun(name)
    name_norm = _normalize(name_core)
    match_data = None
    
    # Tier 1: Exact / Core Noun / Normalized Match in Local Database (300+ items)
    for query in [name_lower, name_core, name_norm]:
        for key in _SUBSTITUTIONS:
            if key.lower() == query or _normalize(key) == _normalize(query):
                match_data = _SUBSTITUTIONS[key]
                break
        if match_data:
            break
            
    if not match_data:
        matches = {k: v for k, v in _SUBSTITUTIONS.items() if name_norm in _normalize(k)}
        if matches:
            first_key = list(matches.keys())[0]
            match_data = matches[first_key]
            
    if not match_data:
        matches = {k: v for k, v in _SUBSTITUTIONS.items() if _normalize(k) in name_norm}
        if matches:
            best_key = max(matches.keys(), key=len)
            match_data = matches[best_key]

    if match_data:
        sub = IngredientSubstitute(**match_data)
        return _adjust_for_recipe_context(sub, recipe_title)
        
    # Tier 2: Spoonacular API Fallback (Auto-Learning Architecture)
    from app.config import settings
    spoonacular_key = settings.SPOONACULAR_API_KEY
    if spoonacular_key:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(
                    "https://api.spoonacular.com/food/ingredients/substitutes",
                    params={"ingredientName": name_norm, "apiKey": spoonacular_key}
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "success" and data.get("substitutes"):
                        subs = data["substitutes"]
                        new_sub_data = {
                            "general": subs,
                            "notes": data.get("message", f"Auto-generated by Spoonacular for '{name_norm}'.")
                        }
                        _SUBSTITUTIONS[name_norm] = new_sub_data
                        with open(_DATA_FILE, "w") as f:
                            json.dump(_SUBSTITUTIONS, f, indent=2)
                            
                        sub = IngredientSubstitute(**new_sub_data)
                        return _adjust_for_recipe_context(sub, recipe_title)
        except Exception as e:
            print(f"Spoonacular API error: {e}")

    # Tier 3: 8-Category Culinary Taxonomy Engine Fallback
    taxonomy_match = _classify_taxonomy(name_core)
    if taxonomy_match:
        return _adjust_for_recipe_context(taxonomy_match, recipe_title)

    # Tier 4: Resilient Fuzzy Match from local database
    close_keys = difflib.get_close_matches(name_norm, _SUBSTITUTIONS.keys(), n=1, cutoff=0.4)
    if close_keys:
        closest_key = close_keys[0]
        fallback_data = dict(_SUBSTITUTIONS[closest_key])
        orig_notes = fallback_data.get("notes", "")
        fallback_data["notes"] = f"Showing closest alternative for '{name}' (matched with {closest_key}). {orig_notes}"
        sub = IngredientSubstitute(**fallback_data)
        return _adjust_for_recipe_context(sub, recipe_title)

    # Ultimate graceful response
    sub = IngredientSubstitute(
        general=["Try using a similar alternative (e.g. olive oil for butter, tofu for meat)"],
        notes=f"No direct substitute found for '{name}'. Consider adjusting seasonings or omitting if non-essential."
    )
    return _adjust_for_recipe_context(sub, recipe_title)

@router.get("/substitutes/{name}", response_model=IngredientSubstitute)
async def get_substitute(name: str, recipe_title: str | None = None):
    """Get rich substitution data for a specific ingredient with optional recipe context."""
    sub = await _find_substitutes(name, recipe_title=recipe_title)
    if not sub:
        return IngredientSubstitute()
    return sub



def _parse_quantity(raw: str) -> float | None:
    """Parse a quantity string like '2', '1/2', '1 1/2', '1.5', '1-2' into a float."""
    if not raw:
        return None
    raw = raw.strip()
    # Mixed fraction like "1 1/2"
    if " " in raw and "/" in raw:
        parts = raw.split()
        sum_val = 0.0
        for p in parts:
            if "/" in p:
                sub_p = p.split("/")
                try:
                    sum_val += float(sub_p[0]) / float(sub_p[1])
                except (ValueError, ZeroDivisionError):
                    pass
            else:
                try:
                    sum_val += float(p)
                except ValueError:
                    pass
        return sum_val if sum_val > 0 else None

    # Range like "1-2" → take the average
    if "-" in raw or "–" in raw:
        parts = re.split(r"[-–]", raw)
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


async def parse_ingredient_line(line: str) -> IngredientItem:
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
            substitutes=await _find_substitutes(name if name else line)
        )

    # Fallback: treat the whole line as the ingredient name
    return IngredientItem(name=line, raw_text=line, substitutes=await _find_substitutes(line))


def split_ingredient_text(text: str) -> list[str]:
    """Split raw text into individual ingredient lines."""
    # Split on newlines, commas, semicolons, or "and"
    lines = re.split(r"[,;\n]+|\band\b", text)
    return [line.strip() for line in lines if line.strip()]


@router.post("/parse", response_model=IngredientParseResult)
async def parse_ingredients(req: IngredientParseRequest):
    """
    Parse natural language ingredient text into structured items.
    Uses rule-based regex parsing (no ML, no external API).

    Examples:
      "2 cups flour, 3 eggs, 1 lb chicken breast"
      "tomatoes, onion, garlic, olive oil"
    """
    lines = split_ingredient_text(req.text)
    items = await asyncio.gather(*(parse_ingredient_line(line) for line in lines))
    names = [item.name for item in items if item.name != "unknown"]

    return IngredientParseResult(
        original_text=req.text,
        ingredients=items,
        ingredient_names=names,
        parser="rule_based",
    )
