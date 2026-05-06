"""
Recipe search router — uses Spoonacular API when available, falls back to demo data.
Also handles saving/listing/deleting bookmarked recipes from the SQLite database.
"""

import json
from pathlib import Path
from datetime import datetime
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

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


# ── Unified recipe database — loaded from recipes.json ─────────
_recipes_path = Path(__file__).parent.parent / "recipes.json"
DEMO_RECIPES: list[RecipeItem] = []

if _recipes_path.exists():
    with open(_recipes_path, encoding="utf-8") as _f:
        _all_recipes = json.load(_f)
    for _r in _all_recipes:
        _nutr = _r.get("nutrition", {})
        DEMO_RECIPES.append(RecipeItem(
            id=_r["id"], title=_r["title"], summary=_r.get("summary", ""),
            image_url=_r.get("image_url"),
            ready_in_minutes=_r.get("ready_in_minutes"),
            servings=_r.get("servings"),
            ingredients=_r.get("ingredients", []),
            instructions=_r.get("instructions"),
            diets=_r.get("diets", []),
            meal_type=_r.get("meal_type"),
            nutrition=RecipeNutrition(**_nutr) if _nutr else None,
        ))


def _match_score(recipe: RecipeItem, search_ingredients: list[str]) -> float:
    """Calculate how well a recipe matches the search ingredients (0.0 to 1.0)."""
    if not search_ingredients:
        return 0.0
    recipe_ings = {ing.lower() for ing in recipe.ingredients}
    search_ings = {ing.lower().strip() for ing in search_ingredients}
    matches = 0
    for search_ing in search_ings:
        for recipe_ing in recipe_ings:
            if search_ing in recipe_ing or recipe_ing in search_ing:
                matches += 1
                break
    return matches / len(search_ings)


def _diet_matches(recipe: RecipeItem, diet: str) -> bool:
    """Return whether a recipe satisfies a dietary filter."""
    if not diet:
        return True

    normalized_diet = diet.lower().replace(" ", "-")
    if normalized_diet == "high-protein":
        return bool(recipe.nutrition and recipe.nutrition.protein_g and recipe.nutrition.protein_g >= 20)

    recipe_diets = {d.lower().replace(" ", "-") for d in recipe.diets}
    return normalized_diet in recipe_diets


async def _search_spoonacular(ingredients: list[str], max_results: int, diet: str | None = None, max_time: int | None = None) -> list[RecipeItem] | None:
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
            results = []
            for item in data:
                results.append(RecipeItem(
                    id=str(item.get("id", "")),
                    title=item.get("title", ""),
                    image_url=item.get("image", ""),
                    ingredients=[
                        ing.get("name", "") for ing in item.get("usedIngredients", [])
                    ] + [
                        ing.get("name", "") for ing in item.get("missedIngredients", [])
                    ],
                    match_score=1.0 - (item.get("missedIngredientCount", 0) / max(len(ingredients), 1)),
                ))
            return results
    except Exception:
        return None


@router.post("/search", response_model=RecipeSearchResponse)
async def search_recipes(req: RecipeSearchRequest):
    """
    Search for recipes by ingredients with optional constraints.
    Constraints: max_calories, max_time (minutes), diet (vegetarian/vegan/keto/gluten-free/high-protein).
    Uses Spoonacular API if a key is configured, otherwise returns demo recipes.
    """
    # Build list of applied constraints for the response
    constraints = []
    if req.max_calories:
        constraints.append(f"≤ {req.max_calories} kcal")
    if req.max_time:
        constraints.append(f"≤ {req.max_time} min")
    if req.diet:
        constraints.append(req.diet)

    # Try Spoonacular first
    api_results = await _search_spoonacular(req.ingredients, req.max_results, req.diet, req.max_time)
    if api_results is not None:
        return RecipeSearchResponse(
            recipes=api_results[:req.max_results],
            source="spoonacular",
            total=len(api_results),
            constraints_applied=constraints,
        )

    # Fallback: match against demo recipes
    scored = []
    for recipe in DEMO_RECIPES:
        score = _match_score(recipe, req.ingredients)
        if score > 0:
            # Apply constraints
            if req.max_calories and recipe.nutrition and recipe.nutrition.calories > req.max_calories:
                continue
            if req.max_time and recipe.ready_in_minutes and recipe.ready_in_minutes > req.max_time:
                continue
            if not _diet_matches(recipe, req.diet or ""):
                continue
            recipe_copy = recipe.model_copy(update={"match_score": score})
            scored.append(recipe_copy)

    # Sort by match score descending
    scored.sort(key=lambda r: r.match_score, reverse=True)
    results = scored[:req.max_results]

    return RecipeSearchResponse(
        recipes=results,
        source="demo",
        total=len(results),
        constraints_applied=constraints,
    )


@router.post("/save", response_model=SavedRecipeResponse)
def save_recipe(req: SaveRecipeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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


@router.get("/saved", response_model=list[SavedRecipeResponse])
def list_saved_recipes(sort_by: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List saved recipes for the current user. Requires authentication."""
    query = db.query(SavedRecipe).filter(SavedRecipe.user_id == current_user.id)
    if sort_by == 'rating':
        query = query.order_by(SavedRecipe.rating.desc().nullslast(), SavedRecipe.saved_at.desc())
    else:
        query = query.order_by(SavedRecipe.saved_at.desc())
    return query.all()

@router.put("/saved/{recipe_id}/rate", response_model=SavedRecipeResponse)
def rate_saved_recipe(recipe_id: int, req: RecipeRateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Rate a saved recipe (1-5 stars). Only the owner can rate. Requires authentication."""
    recipe = db.query(SavedRecipe).filter(SavedRecipe.id == recipe_id, SavedRecipe.user_id == current_user.id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    recipe.rating = req.rating
    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete("/saved/{recipe_id}")
def delete_saved_recipe(recipe_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a saved recipe by ID. Only the owner can delete. Requires authentication."""
    recipe = db.query(SavedRecipe).filter(SavedRecipe.id == recipe_id, SavedRecipe.user_id == current_user.id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted", "id": recipe_id}

@router.get("/daily", response_model=RecipeItem)
def get_daily_recipe():
    """Get the recipe of the day (changes every 24 hours). Prioritizes vegetarian."""
    # Build list of eligible recipes
    eligible = [r for r in DEMO_RECIPES if "vegetarian" in r.diets]
    if not eligible:
        # Fallback if no veg found (though we expect them)
        eligible = DEMO_RECIPES
        
    date_str = datetime.now().strftime("%Y-%m-%d")
    # Seed random with the current date so it's the same all day
    rng = random.Random(date_str)
    
    daily_recipe = rng.choice(eligible)
    return daily_recipe
