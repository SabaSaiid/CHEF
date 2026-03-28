"""
Recipe search router — uses Spoonacular API when available, falls back to demo data.
Also handles saving/listing/deleting bookmarked recipes from the SQLite database.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

from app.config import settings
from app.database import get_db
from app.models import SavedRecipe
from app.schemas import (
    RecipeSearchRequest,
    RecipeSearchResponse,
    RecipeItem,
    RecipeNutrition,
    SaveRecipeRequest,
    SavedRecipeResponse,
)

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


# ── Demo recipe database ───────────────────────────────────────
DEMO_RECIPES = [
    RecipeItem(
        id="demo-1",
        title="Litti Chokha",
        image_url="https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400",
        summary="Classic Bihar specialty — roasted wheat balls stuffed with sattu, served with mashed veggie chokha.",
        ready_in_minutes=45,
        servings=4,
        ingredients=["atta", "sattu", "onion", "garlic", "mustard oil", "ajwain", "salt", "brinjal", "tomato", "green chili"],
        instructions="1. Mix sattu with chopped onion, garlic, green chili, mustard oil, ajwain, and salt to make filling.\n2. Knead atta dough, divide into balls, stuff with sattu mixture, and seal.\n3. Roast litti on cow dung cakes or bake at 200°C for 25 minutes until golden.\n4. For chokha: roast brinjal and tomato, mash together with mustard oil, salt, and garlic.\n5. Dip litti in ghee and serve with chokha.",
        nutrition=RecipeNutrition(calories=320, protein_g=12, carbs_g=48, fat_g=10),
        diets=["vegetarian"],
    ),
    RecipeItem(
        id="demo-2",
        title="Sattu Paratha",
        image_url="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
        summary="Protein-rich stuffed paratha with roasted gram flour — a Bihar breakfast staple.",
        ready_in_minutes=25,
        servings=3,
        ingredients=["atta", "sattu", "onion", "green chili", "lemon", "mustard oil", "cumin", "salt", "ghee"],
        instructions="1. Mix sattu with finely chopped onion, green chili, lemon juice, mustard oil, cumin, and salt.\n2. Knead soft atta dough, rest for 10 minutes.\n3. Roll out dough, place sattu filling, fold and roll gently.\n4. Cook on tawa with ghee until golden brown on both sides.\n5. Serve hot with pickle and curd.",
        nutrition=RecipeNutrition(calories=290, protein_g=10, carbs_g=42, fat_g=9),
        diets=["vegetarian"],
    ),
    RecipeItem(
        id="demo-3",
        title="Dal Chawal",
        image_url="https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400",
        summary="Comforting arhar dal tempered with cumin, garlic, and ghee — served over steamed rice.",
        ready_in_minutes=30,
        servings=3,
        ingredients=["arhar dal", "rice", "onion", "tomato", "garlic", "cumin", "turmeric", "ghee", "green chili", "salt"],
        instructions="1. Wash and pressure cook arhar dal with turmeric and salt for 3-4 whistles.\n2. Cook rice separately.\n3. Heat ghee in a pan, add cumin seeds, let them splutter.\n4. Add chopped garlic, onion, green chili, and sauté until golden.\n5. Add chopped tomato, cook until soft.\n6. Pour the tempering over cooked dal, mix well.\n7. Serve dal over steamed rice with a dollop of ghee.",
        nutrition=RecipeNutrition(calories=350, protein_g=14, carbs_g=55, fat_g=8),
        diets=["vegetarian", "gluten-free"],
    ),
    RecipeItem(
        id="demo-4",
        title="Aloo Gobi",
        image_url="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
        summary="Dry potato and cauliflower curry with turmeric and cumin — a North Indian home favorite.",
        ready_in_minutes=25,
        servings=3,
        ingredients=["potato", "cauliflower", "onion", "tomato", "turmeric", "cumin", "coriander powder", "green chili", "mustard oil", "salt"],
        instructions="1. Cut potato and cauliflower into florets/pieces.\n2. Heat mustard oil, add cumin seeds.\n3. Add chopped onion, sauté until golden.\n4. Add turmeric, coriander powder, and green chili.\n5. Add potato and cauliflower, mix well.\n6. Add chopped tomato, cover and cook on low heat for 15 minutes.\n7. Garnish with fresh coriander and serve with roti.",
        nutrition=RecipeNutrition(calories=180, protein_g=5, carbs_g=28, fat_g=6),
        diets=["vegetarian", "gluten-free", "vegan"],
    ),
    RecipeItem(
        id="demo-5",
        title="Chana Masala",
        image_url="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
        summary="Spicy chickpea curry cooked with onion, tomato, and aromatic spices — rich in protein.",
        ready_in_minutes=35,
        servings=4,
        ingredients=["chickpeas", "onion", "tomato", "ginger", "garlic", "cumin", "coriander powder", "garam masala", "turmeric", "oil", "salt", "lemon"],
        instructions="1. Soak chickpeas overnight, pressure cook until soft (or use canned).\n2. Heat oil, add cumin seeds, then chopped onion.\n3. Sauté until golden, add ginger-garlic paste.\n4. Add tomato, turmeric, coriander powder, cook until oil separates.\n5. Add boiled chickpeas with some cooking water.\n6. Simmer for 10 minutes, add garam masala and lemon juice.\n7. Serve hot with puri or rice.",
        nutrition=RecipeNutrition(calories=280, protein_g=15, carbs_g=40, fat_g=6),
        diets=["vegetarian", "gluten-free", "high-protein"],
    ),
    RecipeItem(
        id="demo-6",
        title="Paneer Tikka",
        image_url="https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400",
        summary="Marinated paneer cubes grilled with bell peppers and onion — smoky and flavorful.",
        ready_in_minutes=30,
        servings=3,
        ingredients=["paneer", "curd", "bell pepper", "onion", "ginger", "garlic", "cumin", "red chili powder", "garam masala", "lemon", "oil", "salt"],
        instructions="1. Cut paneer, bell pepper, and onion into cubes.\n2. Mix curd with ginger-garlic paste, cumin, red chili, garam masala, lemon juice, oil, and salt.\n3. Marinate paneer and veggies in the curd mixture for 20 minutes.\n4. Thread onto skewers and grill or bake at 220°C for 12-15 minutes.\n5. Serve hot with mint chutney.",
        nutrition=RecipeNutrition(calories=260, protein_g=18, carbs_g=10, fat_g=17),
        diets=["vegetarian", "gluten-free", "high-protein", "keto"],
    ),
    RecipeItem(
        id="demo-7",
        title="Palak Paneer",
        image_url="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",
        summary="Creamy spinach curry with soft paneer cubes — nutritious and rich in iron.",
        ready_in_minutes=30,
        servings=3,
        ingredients=["spinach", "paneer", "onion", "tomato", "garlic", "ginger", "cumin", "garam masala", "cream", "salt", "green chili"],
        instructions="1. Blanch spinach in boiling water for 2 minutes, transfer to ice water.\n2. Blend spinach into a smooth paste.\n3. Heat oil, add cumin, then chopped onion, garlic, ginger.\n4. Add tomato and green chili, cook until soft.\n5. Add spinach paste, cumin, garam masala, salt. Simmer 5 minutes.\n6. Add paneer cubes and cream, cook for 3 more minutes.\n7. Serve with naan or roti.",
        nutrition=RecipeNutrition(calories=250, protein_g=16, carbs_g=12, fat_g=16),
        diets=["vegetarian", "gluten-free", "high-protein"],
    ),
    RecipeItem(
        id="demo-8",
        title="Rajma Chawal",
        image_url="https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400",
        summary="Hearty kidney bean curry cooked in thick tomato-onion gravy — a Sunday lunch essential.",
        ready_in_minutes=40,
        servings=4,
        ingredients=["rajma", "rice", "onion", "tomato", "ginger", "garlic", "cumin", "coriander powder", "garam masala", "oil", "salt"],
        instructions="1. Soak rajma overnight, pressure cook with salt until soft.\n2. Heat oil, add cumin seeds, then finely chopped onion.\n3. Sauté until brown, add ginger-garlic paste.\n4. Add pureed tomato, coriander powder, turmeric. Cook until oil separates.\n5. Add cooked rajma with its water, simmer for 15 minutes until thick.\n6. Add garam masala, mash a few beans for creaminess.\n7. Serve hot over steamed rice.",
        nutrition=RecipeNutrition(calories=380, protein_g=16, carbs_g=58, fat_g=7),
        diets=["vegetarian", "gluten-free", "high-protein"],
    ),
    RecipeItem(
        id="demo-9",
        title="Chole Bhature",
        image_url="https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400",
        summary="Spicy chickpea curry served with fluffy deep-fried bread — a beloved North Indian feast.",
        ready_in_minutes=50,
        servings=4,
        ingredients=["chickpeas", "maida", "curd", "onion", "tomato", "ginger", "garlic", "cumin", "coriander powder", "amchur", "oil", "salt"],
        instructions="1. Soak chickpeas overnight, pressure cook until tender.\n2. For bhature: mix maida, curd, salt, oil. Knead soft dough, rest 1 hour.\n3. Heat oil, add cumin, onion, and sauté until golden.\n4. Add ginger-garlic paste, tomato, coriander powder, amchur. Cook well.\n5. Add cooked chole, simmer 10 minutes.\n6. Roll bhature dough into ovals, deep fry until puffed and golden.\n7. Serve chole with bhature, sliced onion, and green chutney.",
        nutrition=RecipeNutrition(calories=420, protein_g=14, carbs_g=52, fat_g=18),
        diets=["vegetarian"],
    ),
    RecipeItem(
        id="demo-10",
        title="Dahi Vada",
        image_url="https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400",
        summary="Soft lentil dumplings soaked in sweetened curd with tangy-spicy chutneys — perfect snack.",
        ready_in_minutes=40,
        servings=4,
        ingredients=["urad dal", "curd", "cumin", "red chili powder", "tamarind chutney", "green chutney", "salt", "oil", "black salt"],
        instructions="1. Soak urad dal for 4 hours, grind into a smooth batter with salt.\n2. Heat oil, drop spoonfuls of batter, fry until golden. Soak vadas in warm water.\n3. Whisk curd with sugar, salt, and roasted cumin powder.\n4. Squeeze water from vadas, place in a dish.\n5. Pour sweetened curd generously over vadas.\n6. Drizzle tamarind and green chutney on top.\n7. Sprinkle red chili powder and cumin. Chill before serving.",
        nutrition=RecipeNutrition(calories=220, protein_g=10, carbs_g=30, fat_g=8),
        diets=["vegetarian", "gluten-free"],
    ),
]


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


async def _search_spoonacular(ingredients: list[str], max_results: int) -> list[RecipeItem] | None:
    """Try to search Spoonacular API. Returns None if unavailable."""
    if not settings.SPOONACULAR_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.spoonacular.com/recipes/findByIngredients",
                params={
                    "ingredients": ",".join(ingredients),
                    "number": max_results,
                    "ranking": 1,
                    "ignorePantry": True,
                    "apiKey": settings.SPOONACULAR_API_KEY,
                },
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
    api_results = await _search_spoonacular(req.ingredients, req.max_results)
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
            if req.diet and req.diet.lower() not in [d.lower() for d in recipe.diets]:
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
def save_recipe(req: SaveRecipeRequest, db: Session = Depends(get_db)):
    """Save a recipe to the local collection."""
    recipe = SavedRecipe(
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
def list_saved_recipes(db: Session = Depends(get_db)):
    """List all saved recipes."""
    return db.query(SavedRecipe).order_by(SavedRecipe.saved_at.desc()).all()


@router.delete("/saved/{recipe_id}")
def delete_saved_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """Delete a saved recipe by ID."""
    recipe = db.query(SavedRecipe).filter(SavedRecipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted", "id": recipe_id}
