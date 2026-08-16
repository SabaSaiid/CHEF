"""
Recipe search router — uses Spoonacular API when available, falls back to demo data.
Also handles saving/listing/deleting bookmarked recipes from the SQLite database.

Performance notes:
- On startup, recipes are indexed by region and meal_type for O(1) set lookups.
- Ingredient matching uses a pre-built inverted index (ingredient → recipe IDs)
  to avoid iterating all 7,000+ recipes on every search request.
"""

import json
import re
from pathlib import Path
from datetime import datetime
import random
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import httpx
from collections import defaultdict

from app.config import settings
from app.database import get_db
from app.models import SavedRecipe, User
from app.auth import get_current_user
from app.schemas import (
    RecipeSearchRequest,
    RecipeSearchResponse,
    RecipeItem,
    RecipeNutrition,
    NutriScoreResponse,
    ChefScoreResponse,
    SaveRecipeRequest,
    SavedRecipeResponse,
    RecipeRateRequest,
)
from app.scoring.calculator import compute_nutri_score, compute_chef_score
from app.scoring.constants import GRADE_ORDER, ALGORITHM_VERSION
from app.services.cache import raw_nutrition_cache, nutri_score_cache

router = APIRouter(prefix="/api/recipes", tags=["recipes"])

# Allergen keyword map for filtering
_ALLERGEN_MAP = {
    "peanut": ["peanut", "groundnut"],
    "dairy": ["milk", "cheese", "butter", "cream", "yogurt", "ghee", "paneer", "curd", "whey"],
    "gluten": ["wheat", "flour", "bread", "pasta", "noodle", "roti", "naan", "maida", "semolina"],
    "egg": ["egg"],
    "soy": ["soy", "tofu", "tempeh", "edamame", "soy sauce"],
    "shellfish": ["shrimp", "crab", "lobster", "oyster", "mussel", "clam", "prawn"],
    "fish": ["fish", "salmon", "tuna", "cod", "sardine", "anchovy", "mackerel"],
    "tree nuts": ["almond", "walnut", "cashew", "pistachio", "pecan", "hazelnut", "brazil nut"],
}

def _recipe_has_allergen(recipe, allergies: list[str], exclude_ingredients: list[str]) -> bool:
    """Return True if recipe contains any allergen or excluded ingredient."""
    if not allergies and not exclude_ingredients:
        return False
    # Build searchable text from ingredients + title
    ingredients_list = recipe.ingredients if isinstance(recipe.ingredients, list) else [recipe.ingredients or ""]
    searchable = (" ".join(ingredients_list) + " " + (recipe.title or "")).lower()
    
    for allergen in (allergies or []):
        keywords = _ALLERGEN_MAP.get(allergen.lower(), [allergen.lower()])
        if any(kw in searchable for kw in keywords):
            return True
    
    for excl in (exclude_ingredients or []):
        if excl.lower() in searchable:
            return True
    
    return False


# ── Startup: load and index recipe database ────────────────────
_recipes_path = Path(__file__).parent.parent / "recipes.json"
DEMO_RECIPES: list[RecipeItem] = []
RECIPES_BY_REGION: dict[str, set[str]] = {}
RECIPES_BY_MEAL_TYPE: dict[str, set[str]] = {}
_INGREDIENT_INDEX: dict[str, set[str]] = defaultdict(set)
_RECIPE_BY_ID: dict[str, RecipeItem] = {}

def load_recipes():
    """Load and index recipes from recipes.json into memory."""
    global DEMO_RECIPES, RECIPES_BY_REGION, RECIPES_BY_MEAL_TYPE, _INGREDIENT_INDEX, _RECIPE_BY_ID
    DEMO_RECIPES.clear()
    RECIPES_BY_REGION.clear()
    RECIPES_BY_MEAL_TYPE.clear()
    _INGREDIENT_INDEX.clear()
    _RECIPE_BY_ID.clear()

    if _recipes_path.exists():
        with open(_recipes_path, encoding="utf-8") as _f:
            _all_recipes = json.load(_f)
        for _r in _all_recipes:
            _nutr = _r.get("nutrition", {})
            region = _r.get("region")
            meal_type = _r.get("meal_type")
            _ns = _r.get("nutri_score") or _r.get("chef_score")
            _nutri_score_obj = NutriScoreResponse(**_ns) if _ns else None
            item = RecipeItem(
                id=_r["id"], title=_r["title"], summary=_r.get("summary", ""),
                image_url=_r.get("image_url"),
                video_url=_r.get("video_url"),
                ready_in_minutes=_r.get("ready_in_minutes"),
                servings=_r.get("servings"),
                ingredients=_r.get("ingredients", []),
                instructions=_r.get("instructions"),
                diets=_r.get("diets", []),
                meal_type=meal_type,
                region=region,
                popularity=_r.get("popularity", 50),
                nutrition=RecipeNutrition(**_nutr) if _nutr else None,
                nutri_score=_nutri_score_obj,
                chef_score=_nutri_score_obj,
            )
            DEMO_RECIPES.append(item)
            _RECIPE_BY_ID[item.id] = item

            if region:
                RECIPES_BY_REGION.setdefault(region.lower(), set()).add(item.id)
            if meal_type:
                for mt in meal_type.lower().split("/"):
                    RECIPES_BY_MEAL_TYPE.setdefault(mt.strip(), set()).add(item.id)

            title_tokens = item.title.lower().split()
            for token in title_tokens:
                if len(token) > 2:
                    _INGREDIENT_INDEX[token].add(item.id)
            for ing in item.ingredients:
                for token in ing.lower().split():
                    if len(token) > 2:
                        _INGREDIENT_INDEX[token].add(item.id)

# Reload recipes dataset: 100% verified working images across Pages 1-5
load_recipes()


# Load ingredient groups taxonomy
_GROUPS_FILE = Path(__file__).resolve().parent.parent / "ingredient_groups.json"
_GROUPS_DATA = {"groups": {}, "common_typos": {}}
if _GROUPS_FILE.exists():
    with open(_GROUPS_FILE, "r", encoding="utf-8") as _gf:
        _GROUPS_DATA = json.load(_gf)

_GROUPS = _GROUPS_DATA.get("groups", {})
_TYPOS = _GROUPS_DATA.get("common_typos", {})


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Compute the Levenshtein (edit) distance between two strings. O(m*n)."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            cost = 0 if c1 == c2 else 1
            curr_row.append(min(
                curr_row[j] + 1,       # insert
                prev_row[j + 1] + 1,   # delete
                prev_row[j] + cost,    # substitute
            ))
        prev_row = curr_row
    return prev_row[-1]


def _fuzzy_match_token(token: str, max_distance: int = 1) -> set[str]:
    """Find inverted index tokens and group names within Levenshtein distance of `token`.
    Only considers candidates of similar length (±max_distance) to avoid spurious matches.
    """
    if len(token) <= 3:
        return set()  # Too short for meaningful fuzzy matching

    fuzzy_hits: set[str] = set()
    # Check against inverted index keys
    for idx_token in _INGREDIENT_INDEX:
        if abs(len(idx_token) - len(token)) > max_distance:
            continue
        if _levenshtein_distance(token, idx_token) <= max_distance:
            fuzzy_hits.add(idx_token)

    # Check against group names
    for group_name in _GROUPS:
        if abs(len(group_name) - len(token)) > max_distance:
            continue
        if _levenshtein_distance(token, group_name) <= max_distance:
            fuzzy_hits.add(group_name)

    return fuzzy_hits


def _expand_ingredient_synonyms(ing: str) -> set[str]:
    """Returns set of synonyms/family members for an ingredient name.
    Falls back to fuzzy matching (Levenshtein distance ≤ 1) when no exact
    typo or group match is found.
    """
    s = ing.lower().strip()
    s = _TYPOS.get(s, s)
    synonyms = {s}
    found_group = False
    for group_name, members in _GROUPS.items():
        if s == group_name or s in members:
            synonyms.update(members)
            synonyms.add(group_name)
            found_group = True

    # Fuzzy fallback: if no group/typo match, try Levenshtein distance ≤ 1
    if not found_group and len(s) > 3:
        fuzzy_matches = _fuzzy_match_token(s, max_distance=1)
        for fm in fuzzy_matches:
            synonyms.add(fm)
            # Also expand group members if the fuzzy match is a group name
            if fm in _GROUPS:
                synonyms.update(_GROUPS[fm])
                synonyms.add(fm)

    return synonyms


def _match_score(recipe: RecipeItem, search_ingredients: list[str]) -> float:
    """
    Calculate how well a recipe matches the search ingredients (0.0 to 1.0).
    Uses ingredient taxonomy expansion, typo correction, and string containment.
    """
    if not search_ingredients:
        return 1.0

    recipe_ings = [ing.lower() for ing in recipe.ingredients]
    title_lower = recipe.title.lower()
    matches = 0

    for search_ing in search_ingredients:
        expanded_terms = _expand_ingredient_synonyms(search_ing)
        matched = False
        for term in expanded_terms:
            if term in title_lower:
                matched = True
                break
            for recipe_ing in recipe_ings:
                if term in recipe_ing or recipe_ing in term:
                    matched = True
                    break
            if matched:
                break
        if matched:
            matches += 1

    return round(matches / len(search_ingredients), 2)


def _get_candidate_ids(search_ingredients: list[str]) -> set[str] | None:
    """
    Use the inverted index to find candidate recipe IDs that contain at least
    one of the search ingredient tokens or taxonomy synonyms.
    Falls back to fuzzy matching (Levenshtein distance ≤ 1) when exact token
    lookups yield no results for a given ingredient term.
    Returns None if no ingredients given.
    """
    if not search_ingredients:
        return None  # No filtering — use full list

    candidate_ids: set[str] = set()
    for ing in search_ingredients:
        terms = _expand_ingredient_synonyms(ing)
        ing_candidates: set[str] = set()
        for term in terms:
            for token in term.split():
                if len(token) > 2 and token in _INGREDIENT_INDEX:
                    ing_candidates |= _INGREDIENT_INDEX[token]
        # Fuzzy fallback: if no candidates found for this ingredient, try fuzzy index lookup
        if not ing_candidates:
            for token in ing.lower().strip().split():
                if len(token) > 3:
                    fuzzy_tokens = _fuzzy_match_token(token, max_distance=1)
                    for ft in fuzzy_tokens:
                        if ft in _INGREDIENT_INDEX:
                            ing_candidates |= _INGREDIENT_INDEX[ft]
        candidate_ids |= ing_candidates
    return candidate_ids




def _diet_matches(recipe: RecipeItem, diet: str) -> bool:
    """Return whether a recipe satisfies a dietary filter."""
    if not diet:
        return True
    normalized_diet = diet.lower().replace(" ", "-")
    if normalized_diet == "high-protein":
        return bool(recipe.nutrition and recipe.nutrition.protein_g and recipe.nutrition.protein_g >= 20)
    recipe_diets = {d.lower().replace(" ", "-") for d in recipe.diets}
    if normalized_diet in recipe_diets:
        return True
    # Synonyms & variations
    if normalized_diet in ("non-veg", "non-vegetarian") and any(d in ("non-veg", "non-vegetarian") for d in recipe_diets):
        return True
    if normalized_diet in ("veg", "vegetarian") and any(d in ("veg", "vegetarian") for d in recipe_diets):
        return True
    return any(normalized_diet in d or d in normalized_diet for d in recipe_diets)


def _extract_instructions(recipe_info: dict) -> str:
    """
    Extract step-by-step instructions from Spoonacular recipe info.
    Prefers analyzedInstructions (structured steps) over raw instructions HTML.
    """
    # Try analyzedInstructions first (structured, clean steps)
    analyzed = recipe_info.get("analyzedInstructions", [])
    if analyzed:
        steps = []
        for section in analyzed:
            section_name = section.get("name", "")
            section_steps = section.get("steps", [])
            if section_name and len(analyzed) > 1:
                steps.append(f"— {section_name} —")
            for step in section_steps:
                step_text = step.get("step", "").strip()
                if step_text:
                    steps.append(f"{step.get('number', len(steps)+1)}. {step_text}")
        if steps:
            return "\n".join(steps)

    # Fallback: raw instructions field (may contain HTML)
    raw = recipe_info.get("instructions", "")
    if raw:
        # Strip HTML tags
        clean = re.sub(r"<[^>]+>", "\n", raw)
        # Collapse whitespace and clean up
        lines = [line.strip() for line in clean.split("\n") if line.strip()]
        if lines:
            # Add numbering if not already numbered
            result = []
            for i, line in enumerate(lines, 1):
                if not re.match(r"^\d+[\.\)]\s", line):
                    result.append(f"{i}. {line}")
                else:
                    result.append(line)
            return "\n".join(result)

    return ""


async def _search_spoonacular(
    ingredients: list[str],
    max_results: int,
    diet: str | None = None,
    max_time: int | None = None,
) -> list[RecipeItem] | None:
    """
    Search Spoonacular API with full recipe details.
    
    Step 1: findByIngredients to get matching recipe IDs.
    Step 2: informationBulk to get full details (instructions, nutrition, etc.)
    """
    if not settings.SPOONACULAR_API_KEY:
        return None
    try:
        params = {
            "ingredients": ",".join(ingredients),
            "number": max_results,
            "ranking": 1,
            "ignorePantry": True,
            "apiKey": settings.SPOONACULAR_API_KEY,
        }
        if diet and diet.lower() != "high-protein":
            params["diet"] = diet
        if max_time:
            params["maxReadyTime"] = max_time

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: Find recipes by ingredients
            resp = await client.get(
                "https://api.spoonacular.com/recipes/findByIngredients",
                params=params,
            )
            if resp.status_code != 200:
                return None
            search_data = resp.json()
            if not search_data:
                return []

            # Build match scores from the initial search
            match_scores = {}
            for item in search_data:
                rid = str(item.get("id", ""))
                missed = item.get("missedIngredientCount", 0)
                match_scores[rid] = 1.0 - (missed / max(len(ingredients), 1))

            # Step 2: Fetch full recipe details in bulk (with dual-layer caching)
            all_recipe_ids = [str(item["id"]) for item in search_data if "id" in item]
            cached_infos = {}
            missing_ids = []

            for rid in all_recipe_ids:
                cached_payload = raw_nutrition_cache.get(f"raw_nutrition:{rid}")
                if cached_payload is not None:
                    cached_infos[rid] = cached_payload
                else:
                    missing_ids.append(rid)

            if missing_ids:
                bulk_resp = await client.get(
                    "https://api.spoonacular.com/recipes/informationBulk",
                    params={
                        "ids": ",".join(missing_ids),
                        "apiKey": settings.SPOONACULAR_API_KEY,
                        "includeNutrition": True,
                    },
                )
                if bulk_resp.status_code == 200:
                    for info in bulk_resp.json():
                        rid = str(info.get("id", ""))
                        raw_nutrition_cache.set(f"raw_nutrition:{rid}", info)
                        cached_infos[rid] = info

            results = []
            for rid in all_recipe_ids:
                info = cached_infos.get(rid)
                if not info:
                    continue

                # Extract ingredients with amounts
                ext_ingredients = []
                for ing in info.get("extendedIngredients", []):
                    original = ing.get("original", ing.get("name", ""))
                    ext_ingredients.append(original)

                # Extract nutrition
                nutrition = None
                nutr_data = info.get("nutrition", {})
                if nutr_data:
                    nutrients = {n["name"].lower(): n["amount"] for n in nutr_data.get("nutrients", [])}
                    nutrition = RecipeNutrition(
                        calories=nutrients.get("calories", 0),
                        protein_g=nutrients.get("protein", 0),
                        carbs_g=nutrients.get("carbohydrates", 0),
                        fat_g=nutrients.get("fat", 0),
                    )

                # Compute Nutri-Score with Store B caching
                score_cache_key = f"nutri_score:{rid}:{ALGORITHM_VERSION}"
                cached_score = nutri_score_cache.get(score_cache_key)
                if cached_score is None:
                    calc_res = compute_nutri_score(
                        nutrition={
                            "calories": nutrition.calories if nutrition else 0,
                            "protein_g": nutrition.protein_g if nutrition else 0,
                            "carbs_g": nutrition.carbs_g if nutrition else 0,
                            "fat_g": nutrition.fat_g if nutrition else 0,
                        },
                        ingredients=ext_ingredients,
                        servings=info.get("servings", 1) or 1,
                        title=info.get("title", ""),
                    )
                    cached_score = NutriScoreResponse(**calc_res.to_dict())
                    nutri_score_cache.set(score_cache_key, cached_score)

                # Extract instructions
                instructions = _extract_instructions(info)

                # Clean summary (remove HTML tags)
                summary = info.get("summary", "")
                if summary:
                    summary = re.sub(r"<[^>]+>", "", summary)

                results.append(RecipeItem(
                    id=rid,
                    title=info.get("title", ""),
                    image_url=info.get("image", ""),
                    summary=summary,
                    ready_in_minutes=info.get("readyInMinutes"),
                    servings=info.get("servings"),
                    ingredients=ext_ingredients,
                    instructions=instructions if instructions else None,
                    diets=info.get("diets", []),
                    nutrition=nutrition,
                    nutri_score=cached_score,
                    chef_score=cached_score,
                    source_url=info.get("sourceUrl"),
                    match_score=match_scores.get(rid, 0.0),
                ))

            return results
    except Exception:
        return None


@router.post(
    "/search",
    response_model=RecipeSearchResponse,
    response_model_exclude_none=True,
    summary="Search recipes by ingredients and dietary constraints",
    responses={
        200: {"description": "Matching recipes returned successfully"},
    },
)
async def search_recipes(req: RecipeSearchRequest):
    """
    Search for recipes by ingredients with optional constraints.

    **Constraints supported:**
    - `max_calories` — maximum calories per serving
    - `max_time` — maximum cook time in minutes
    - `diet` — vegetarian | vegan | keto | gluten-free | high-protein | non-vegetarian
    - `region` — e.g. Bihar, Punjab, South Indian
    - `meal_type` — Breakfast | Lunch | Dinner | Snack

    Uses Spoonacular API if a key is configured, otherwise queries the local 7,000+ recipe database.
    """
    constraints = []
    if req.max_calories:
        constraints.append(f"≤ {req.max_calories} kcal")
    if req.max_time:
        constraints.append(f"≤ {req.max_time} min")
    if req.diet:
        constraints.append(req.diet)
    if req.region:
        constraints.append(f"Region: {req.region}")
    if req.meal_type:
        constraints.append(f"Meal: {req.meal_type}")
    min_score_filter = req.min_nutri_score or req.min_chef_score
    if min_score_filter:
        constraints.append(f"Nutri-Score ≥ {min_score_filter}")

    # Precompute allowed Nutri-Score grades for filtering
    min_grade_idx = GRADE_ORDER.index(min_score_filter.upper()) if min_score_filter and min_score_filter.upper() in GRADE_ORDER else None
    allowed_grades = set(GRADE_ORDER[:min_grade_idx + 1]) if min_grade_idx is not None else None

    # Try Spoonacular first if ingredients are provided
    if req.ingredients:
        total_needed = req.max_results * req.page
        api_results = await _search_spoonacular(req.ingredients, total_needed, req.diet, req.max_time)
        if api_results is not None:
            # Filter out allergens and excluded ingredients
            if req.allergies or req.exclude_ingredients:
                api_results = [r for r in api_results if not _recipe_has_allergen(r, req.allergies, req.exclude_ingredients)]

            if req.sort_by == "fastest":
                api_results.sort(key=lambda r: r.ready_in_minutes or 9999)
            elif req.sort_by == "lowest_calories":
                api_results.sort(key=lambda r: r.nutrition.calories if r.nutrition else 99999)
            elif req.sort_by == "highest_protein":
                api_results.sort(key=lambda r: r.nutrition.protein_g if r.nutrition and r.nutrition.protein_g else 0, reverse=True)
            
            start_idx = (req.page - 1) * req.max_results
            end_idx = start_idx + req.max_results
            return RecipeSearchResponse(
                recipes=api_results[start_idx:end_idx],
                source="Spoonacular",
                total=len(api_results),
                constraints_applied=constraints,
            )

    # ── Local database search ────────────────────────────────────

    # Step 1: Apply region / meal-type set filters first (O(1) lookups with substring fallback)
    allowed_ids: set[str] | None = None
    if req.region:
        reg_key = req.region.lower()
        region_ids = RECIPES_BY_REGION.get(reg_key)
        if not region_ids:
            region_ids = {rid for rname, rset in RECIPES_BY_REGION.items() if reg_key in rname or rname in reg_key for rid in rset}
        allowed_ids = region_ids if allowed_ids is None else allowed_ids & region_ids

    if req.meal_type:
        meal_key = req.meal_type.lower()
        meal_ids = RECIPES_BY_MEAL_TYPE.get(meal_key)
        if not meal_ids:
            meal_ids = {rid for mname, mset in RECIPES_BY_MEAL_TYPE.items() if meal_key in mname or mname in meal_key for rid in mset}
        allowed_ids = meal_ids if allowed_ids is None else allowed_ids & meal_ids

    # Step 2: Use the inverted index to narrow ingredient candidates
    ingredient_candidates = _get_candidate_ids(req.ingredients)

    # Step 3: Intersect all filter sets to get the working candidate set
    if ingredient_candidates is not None and allowed_ids is not None:
        working_ids = ingredient_candidates & allowed_ids
    elif ingredient_candidates is not None:
        working_ids = ingredient_candidates
    elif allowed_ids is not None:
        working_ids = allowed_ids
    else:
        working_ids = None  # No filters — iterate all

    # Step 4: Score and apply remaining constraints
    scored: list[RecipeItem] = []
    candidates = (
        (_RECIPE_BY_ID[rid] for rid in working_ids if rid in _RECIPE_BY_ID)
        if working_ids is not None
        else iter(DEMO_RECIPES)
    )

    for recipe in candidates:
        score = _match_score(recipe, req.ingredients)
        if score == 0 and req.ingredients:
            continue
        if req.max_calories and recipe.nutrition and recipe.nutrition.calories > req.max_calories:
            continue
        if req.max_time and recipe.ready_in_minutes and recipe.ready_in_minutes > req.max_time:
            continue
        if not _diet_matches(recipe, req.diet or ""):
            continue
        # Allergen / excluded ingredient filter
        if _recipe_has_allergen(recipe, req.allergies or [], req.exclude_ingredients or []):
            continue
        # Nutri-Score filter
        score_obj = recipe.nutri_score or recipe.chef_score
        if allowed_grades and score_obj and score_obj.grade not in allowed_grades:
            continue
        scored.append(recipe.model_copy(update={"match_score": score}))

    # Step 5: Sort
    if req.sort_by == "fastest":
        scored.sort(key=lambda r: (r.ready_in_minutes or 9999, -r.match_score))
    elif req.sort_by == "lowest_calories":
        scored.sort(key=lambda r: (r.nutrition.calories if r.nutrition else 99999, -r.match_score))
    elif req.sort_by == "highest_protein":
        scored.sort(key=lambda r: (r.nutrition.protein_g if r.nutrition and r.nutrition.protein_g else 0), reverse=True)
    elif req.sort_by == "healthiest":
        scored.sort(key=lambda r: (
            GRADE_ORDER.index((r.nutri_score or r.chef_score).grade) if (r.nutri_score or r.chef_score) and (r.nutri_score or r.chef_score).grade in GRADE_ORDER else 99,
            (r.nutri_score or r.chef_score).numeric_score if (r.nutri_score or r.chef_score) else 99,
            -r.match_score,
        ))
    else:
        if not req.ingredients:
            scored.sort(
                key=lambda r: (1 if r.region and r.region.lower() == "bihar" else 0, r.popularity),
                reverse=True
            )
        else:
            scored.sort(key=lambda r: (r.match_score, r.popularity), reverse=True)

    start_idx = (req.page - 1) * req.max_results
    end_idx = start_idx + req.max_results

    return RecipeSearchResponse(
        recipes=scored[start_idx:end_idx],
        source="CHEF Database",
        total=len(scored),
        constraints_applied=constraints,
    )


@router.post("/save", response_model=SavedRecipeResponse, response_model_exclude_none=True, status_code=201)
def save_recipe(
    req: SaveRecipeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a recipe to the current user's collection. Requires authentication."""
    # Prevent duplicates — check if same title already saved by this user
    existing = db.query(SavedRecipe).filter(
        SavedRecipe.user_id == current_user.id,
        SavedRecipe.title == req.title
    ).first()
    if existing:
        return existing

    recipe = SavedRecipe(
        user_id=current_user.id,
        title=req.title,
        image_url=req.image_url,
        summary=req.summary,
        ingredients=req.ingredients,
        instructions=req.instructions,
        source_url=req.source_url,
        calories=req.calories,
        protein_g=req.protein_g,
        carbs_g=req.carbs_g,
        fat_g=req.fat_g,
        ready_in_minutes=req.ready_in_minutes,
        servings=req.servings,
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.get("/saved", response_model=list[SavedRecipeResponse], response_model_exclude_none=True)
def list_saved_recipes(
    sort_by: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List saved recipes for the current user. Use `sort_by=rating` to sort by star rating."""
    query = db.query(SavedRecipe).filter(SavedRecipe.user_id == current_user.id)
    if sort_by == "rating":
        query = query.order_by(SavedRecipe.rating.desc().nullslast(), SavedRecipe.saved_at.desc())
    else:
        query = query.order_by(SavedRecipe.saved_at.desc())
    return query.all()


@router.put(
    "/saved/{recipe_id}/rate",
    response_model=SavedRecipeResponse,
    response_model_exclude_none=True,
    responses={404: {"description": "Recipe not found in user's collection"}},
)
def rate_saved_recipe(
    recipe_id: int,
    req: RecipeRateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rate a saved recipe (1–5 stars). Only the owner can rate. Requires authentication."""
    recipe = db.query(SavedRecipe).filter(
        SavedRecipe.id == recipe_id,
        SavedRecipe.user_id == current_user.id,
    ).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    recipe.rating = req.rating
    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete(
    "/saved/{recipe_id}",
    status_code=200,
    responses={404: {"description": "Recipe not found in user's collection"}},
)
def delete_saved_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a saved recipe by ID. Only the owner can delete. Requires authentication."""
    recipe = db.query(SavedRecipe).filter(
        SavedRecipe.id == recipe_id,
        SavedRecipe.user_id == current_user.id,
    ).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted", "id": recipe_id}


@router.get(
    "/daily",
    response_model=RecipeItem,
    response_model_exclude_none=True,
    summary="Get the recipe of the day",
    responses={503: {"description": "No recipes available"}},
)
async def get_daily_recipe(
    date: str | None = None,
    refresh: bool = False,
    response: Response = None,
):
    """
    Get the recipe of the day — changes every 24 hours or on-demand via refresh.

    **Query Parameters:**
    - `date`: Optional client local date (YYYY-MM-DD) to align with user's timezone.
    - `refresh`: If True, forces a fresh random recipe selection.
    """
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    date_str = date or datetime.now().strftime("%Y-%m-%d")
    rng = random.Random() if refresh else random.Random(date_str)

    # ── Strategy 1: Spoonacular (accurate images + rich data) ────
    if settings.SPOONACULAR_API_KEY:
        try:
            # Pick a food-related tag to keep results interesting
            daily_tags = [
                "main course", "dessert", "appetizer", "salad", "soup",
                "breakfast", "side dish", "snack", "beverage", "bread",
            ]
            tag = rng.choice(daily_tags)

            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(
                    "https://api.spoonacular.com/recipes/random",
                    params={
                        "apiKey": settings.SPOONACULAR_API_KEY,
                        "number": 1,
                        "tags": tag,
                        "includeNutrition": True,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    recipes_list = data.get("recipes", [])
                    if recipes_list:
                        info = recipes_list[0]
                        # Only use if it has a valid image
                        image_url = info.get("image", "")
                        if image_url and image_url.startswith("http"):
                            # Extract ingredients
                            ext_ingredients = []
                            for ing in info.get("extendedIngredients", []):
                                ext_ingredients.append(
                                    ing.get("original", ing.get("name", ""))
                                )

                            # Extract nutrition
                            nutrition = None
                            nutr_data = info.get("nutrition", {})
                            if nutr_data:
                                nutrients = {
                                    n["name"].lower(): n["amount"]
                                    for n in nutr_data.get("nutrients", [])
                                }
                                nutrition = RecipeNutrition(
                                    calories=nutrients.get("calories", 0),
                                    protein_g=nutrients.get("protein", 0),
                                    carbs_g=nutrients.get("carbohydrates", 0),
                                    fat_g=nutrients.get("fat", 0),
                                )

                            # Extract instructions
                            instructions = _extract_instructions(info)

                            # Clean summary
                            summary = info.get("summary", "")
                            if summary:
                                summary = re.sub(r"<[^>]+>", "", summary)

                            return RecipeItem(
                                id=str(info.get("id", "")),
                                title=info.get("title", ""),
                                image_url=image_url,
                                summary=summary,
                                ready_in_minutes=info.get("readyInMinutes"),
                                servings=info.get("servings"),
                                ingredients=ext_ingredients,
                                instructions=instructions or None,
                                diets=info.get("diets", []),
                                nutrition=nutrition,
                                source_url=info.get("sourceUrl"),
                            )
        except Exception:
            pass  # Fall through to local database

    # ── Strategy 2: Local database fallback ──────────────────────
    # Filter to only high-quality, complete recipes with verified images & instructions
    quality_filter = [
        r for r in DEMO_RECIPES
        if r.image_url
        and r.instructions
        and len(r.instructions) >= 50
        and len(r.ingredients) >= 3
    ]

    if not quality_filter:
        quality_filter = DEMO_RECIPES  # ultimate fallback
    if not quality_filter:
        raise HTTPException(status_code=503, detail="No recipes available in the database.")

    return rng.choice(quality_filter)


@router.get(
    "/quick",
    response_model=list[RecipeItem],
    response_model_exclude_none=True,
    summary="Get 4 quick and easy recipes under 30 minutes",
)
async def get_quick_recipes(
    date: str | None = None,
    refresh: bool = False,
    response: Response = None,
):
    """
    Get 4 randomized quick recipes (under 30 minutes).
    Changes daily to match the recipe of the day's seed behavior or on-demand via refresh.
    """
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    date_str = date or datetime.now().strftime("%Y-%m-%d")
    seed = None if refresh else f"quick-{date_str}"
    rng = random.Random(seed)
    
    # Filter to high-quality, quick recipes
    quick_filter = [
        r for r in DEMO_RECIPES
        if r.ready_in_minutes and r.ready_in_minutes <= 30
        and r.image_url
        and r.instructions
        and len(r.instructions) >= 50
    ]
    
    if not quick_filter:
        return []
    
    # Randomly select up to 4
    sample_size = min(4, len(quick_filter))
    return rng.sample(quick_filter, sample_size)

