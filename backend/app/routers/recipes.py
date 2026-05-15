"""
Recipe search router — uses Spoonacular API when available, falls back to demo data.
Also handles saving/listing/deleting bookmarked recipes from the SQLite database.

Performance notes:
- On startup, recipes are indexed by region and meal_type for O(1) set lookups.
- Ingredient matching uses a pre-built inverted index (ingredient → recipe IDs)
  to avoid iterating all 7,000+ recipes on every search request.
"""

import json
from pathlib import Path
from datetime import datetime
import random
from fastapi import APIRouter, Depends, HTTPException
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
    SaveRecipeRequest,
    SavedRecipeResponse,
    RecipeRateRequest,
)

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


# ── Startup: load and index recipe database ────────────────────
_recipes_path = Path(__file__).parent.parent / "recipes.json"
DEMO_RECIPES: list[RecipeItem] = []
RECIPES_BY_REGION: dict[str, set[str]] = {}
RECIPES_BY_MEAL_TYPE: dict[str, set[str]] = {}

# Inverted index: ingredient token → set of recipe IDs
# This lets ingredient matching run in O(k) where k = number of search terms
# instead of O(n * m) where n = 7000 recipes and m = search terms.
_INGREDIENT_INDEX: dict[str, set[str]] = defaultdict(set)
# Recipe lookup by ID for O(1) retrieval
_RECIPE_BY_ID: dict[str, RecipeItem] = {}

if _recipes_path.exists():
    with open(_recipes_path, encoding="utf-8") as _f:
        _all_recipes = json.load(_f)
    for _r in _all_recipes:
        _nutr = _r.get("nutrition", {})
        region = _r.get("region")
        meal_type = _r.get("meal_type")
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
        )
        DEMO_RECIPES.append(item)
        _RECIPE_BY_ID[item.id] = item

        # Populate region / meal-type indexes
        if region:
            RECIPES_BY_REGION.setdefault(region.lower(), set()).add(item.id)
        if meal_type:
            for mt in meal_type.lower().split("/"):
                RECIPES_BY_MEAL_TYPE.setdefault(mt.strip(), set()).add(item.id)

        # Populate inverted ingredient index
        title_tokens = item.title.lower().split()
        for token in title_tokens:
            if len(token) > 2:  # skip very short tokens like "a", "of"
                _INGREDIENT_INDEX[token].add(item.id)
        for ing in item.ingredients:
            for token in ing.lower().split():
                if len(token) > 2:
                    _INGREDIENT_INDEX[token].add(item.id)


def _match_score(recipe: RecipeItem, search_ingredients: list[str]) -> float:
    """
    Calculate how well a recipe matches the search ingredients (0.0 to 1.0).
    Uses direct string containment — called only on the pre-filtered candidate set.
    """
    if not search_ingredients:
        return 1.0

    recipe_ings = {ing.lower() for ing in recipe.ingredients}
    title_lower = recipe.title.lower()
    matches = 0

    for search_ing in search_ingredients:
        s = search_ing.lower().strip()
        if s in title_lower:
            matches += 1
            continue
        for recipe_ing in recipe_ings:
            if s in recipe_ing or recipe_ing in s:
                matches += 1
                break

    return matches / len(search_ingredients)


def _get_candidate_ids(search_ingredients: list[str]) -> set[str] | None:
    """
    Use the inverted index to find candidate recipe IDs that contain at least
    one of the search ingredient tokens. Returns None if no ingredients given.
    """
    if not search_ingredients:
        return None  # No filtering — use full list

    candidate_ids: set[str] = set()
    for ing in search_ingredients:
        for token in ing.lower().split():
            if len(token) > 2 and token in _INGREDIENT_INDEX:
                candidate_ids |= _INGREDIENT_INDEX[token]
    return candidate_ids


def _diet_matches(recipe: RecipeItem, diet: str) -> bool:
    """Return whether a recipe satisfies a dietary filter."""
    if not diet:
        return True
    normalized_diet = diet.lower().replace(" ", "-")
    if normalized_diet == "high-protein":
        return bool(recipe.nutrition and recipe.nutrition.protein_g and recipe.nutrition.protein_g >= 20)
    recipe_diets = {d.lower().replace(" ", "-") for d in recipe.diets}
    return normalized_diet in recipe_diets


async def _search_spoonacular(
    ingredients: list[str],
    max_results: int,
    diet: str | None = None,
    max_time: int | None = None,
) -> list[RecipeItem] | None:
    """Try to search Spoonacular API. Returns None if unavailable."""
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

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.spoonacular.com/recipes/findByIngredients",
                params=params,
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            return [
                RecipeItem(
                    id=str(item.get("id", "")),
                    title=item.get("title", ""),
                    image_url=item.get("image", ""),
                    ingredients=[
                        ing.get("name", "") for ing in item.get("usedIngredients", [])
                    ] + [
                        ing.get("name", "") for ing in item.get("missedIngredients", [])
                    ],
                    match_score=1.0 - (item.get("missedIngredientCount", 0) / max(len(ingredients), 1)),
                )
                for item in data
            ]
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

    # Try Spoonacular first if ingredients are provided
    if req.ingredients:
        api_results = await _search_spoonacular(req.ingredients, req.max_results, req.diet, req.max_time)
        if api_results is not None:
            return RecipeSearchResponse(
                recipes=api_results[:req.max_results],
                source="Spoonacular",
                total=len(api_results),
                constraints_applied=constraints,
            )

    # ── Local database search ────────────────────────────────────

    # Step 1: Apply region / meal-type set filters first (O(1) lookups)
    allowed_ids: set[str] | None = None
    if req.region:
        region_ids = RECIPES_BY_REGION.get(req.region.lower(), set())
        allowed_ids = region_ids if allowed_ids is None else allowed_ids & region_ids
    if req.meal_type:
        meal_ids = RECIPES_BY_MEAL_TYPE.get(req.meal_type.lower(), set())
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
        scored.append(recipe.model_copy(update={"match_score": score}))

    # Step 5: Sort
    if not req.ingredients:
        scored.sort(
            key=lambda r: (1 if r.region and r.region.lower() == "bihar" else 0, r.popularity),
            reverse=True
        )
    else:
        scored.sort(key=lambda r: (r.match_score, r.popularity), reverse=True)

    return RecipeSearchResponse(
        recipes=scored[:req.max_results],
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
    responses={503: {"description": "No recipes available in the database"}},
)
def get_daily_recipe():
    """
    Get the recipe of the day — changes every 24 hours.
    Prioritizes vegetarian recipes for a balanced recommendation.
    """
    eligible = [r for r in DEMO_RECIPES if "vegetarian" in r.diets]
    if not eligible:
        eligible = DEMO_RECIPES
    if not eligible:
        raise HTTPException(status_code=503, detail="No recipes available in the database.")

    date_str = datetime.now().strftime("%Y-%m-%d")
    rng = random.Random(date_str)
    return rng.choice(eligible)
