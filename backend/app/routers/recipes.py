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


# ── Recipe database ────────────────────────────────────────────
DEMO_RECIPES = [
    # ── Bihar / Eastern India ──
    RecipeItem(id="r-1", title="Litti Chokha", image_url="https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400",
        summary="Classic Bihar specialty — roasted wheat balls stuffed with sattu, served with mashed veggie chokha.", ready_in_minutes=45, servings=4,
        ingredients=["atta", "sattu", "onion", "garlic", "mustard oil", "ajwain", "salt", "brinjal", "tomato", "green chili"],
        instructions="1. Mix sattu with chopped onion, garlic, green chili, mustard oil, ajwain, and salt.\n2. Knead atta dough, stuff with sattu mixture, seal.\n3. Bake at 200°C for 25 min.\n4. Roast brinjal and tomato, mash into chokha.\n5. Dip litti in ghee and serve.",
        nutrition=RecipeNutrition(calories=320, protein_g=12, carbs_g=48, fat_g=10), diets=["vegetarian"]),
    RecipeItem(id="r-2", title="Sattu Paratha", image_url="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
        summary="Protein-rich stuffed paratha with roasted gram flour — a Bihar breakfast staple.", ready_in_minutes=25, servings=3,
        ingredients=["atta", "sattu", "onion", "green chili", "lemon", "mustard oil", "cumin", "salt", "ghee"],
        instructions="1. Mix sattu with onion, chili, lemon juice, oil, cumin, salt.\n2. Stuff into rolled atta dough.\n3. Cook on tawa with ghee until golden.",
        nutrition=RecipeNutrition(calories=290, protein_g=10, carbs_g=42, fat_g=9), diets=["vegetarian"]),

    # ── North Indian Classics ──
    RecipeItem(id="r-3", title="Dal Chawal", image_url="https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400",
        summary="Comforting arhar dal tempered with cumin, garlic, and ghee — served over steamed rice.", ready_in_minutes=30, servings=3,
        ingredients=["arhar dal", "rice", "onion", "tomato", "garlic", "cumin", "turmeric", "ghee", "green chili", "salt"],
        instructions="1. Pressure cook dal with turmeric.\n2. Temper with cumin, garlic, onion, tomato in ghee.\n3. Pour over dal, serve with rice.",
        nutrition=RecipeNutrition(calories=350, protein_g=14, carbs_g=55, fat_g=8), diets=["vegetarian", "gluten-free"]),
    RecipeItem(id="r-4", title="Aloo Gobi", image_url="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
        summary="Dry potato and cauliflower curry with turmeric and cumin — a North Indian home favorite.", ready_in_minutes=25, servings=3,
        ingredients=["potato", "cauliflower", "onion", "tomato", "turmeric", "cumin", "coriander powder", "green chili", "mustard oil", "salt"],
        instructions="1. Cut potato and cauliflower.\n2. Heat mustard oil, add cumin, onion.\n3. Add turmeric, coriander, chili.\n4. Add veggies, cover, cook 15 min.",
        nutrition=RecipeNutrition(calories=180, protein_g=5, carbs_g=28, fat_g=6), diets=["vegetarian", "gluten-free", "vegan"]),
    RecipeItem(id="r-5", title="Chana Masala", image_url="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
        summary="Spicy chickpea curry cooked with onion, tomato, and aromatic spices — rich in protein.", ready_in_minutes=35, servings=4,
        ingredients=["chickpeas", "onion", "tomato", "ginger", "garlic", "cumin", "coriander powder", "garam masala", "turmeric", "oil", "salt", "lemon"],
        instructions="1. Soak and cook chickpeas.\n2. Sauté onion, ginger-garlic in oil.\n3. Add tomato, spices, chickpeas.\n4. Simmer 10 min, finish with garam masala and lemon.",
        nutrition=RecipeNutrition(calories=280, protein_g=15, carbs_g=40, fat_g=6), diets=["vegetarian", "gluten-free", "high-protein"]),
    RecipeItem(id="r-6", title="Paneer Tikka", image_url="https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400",
        summary="Marinated paneer cubes grilled with bell peppers and onion — smoky and flavorful.", ready_in_minutes=30, servings=3,
        ingredients=["paneer", "curd", "bell pepper", "onion", "ginger", "garlic", "cumin", "red chili powder", "garam masala", "lemon", "oil", "salt"],
        instructions="1. Marinate paneer and veggies in spiced curd.\n2. Thread on skewers.\n3. Grill or bake at 220°C for 12-15 min.\n4. Serve with mint chutney.",
        nutrition=RecipeNutrition(calories=260, protein_g=18, carbs_g=10, fat_g=17), diets=["vegetarian", "gluten-free", "high-protein", "keto"]),
    RecipeItem(id="r-7", title="Palak Paneer",
        summary="Creamy spinach curry with soft paneer cubes — nutritious and rich in iron.", ready_in_minutes=30, servings=3,
        ingredients=["spinach", "paneer", "onion", "tomato", "garlic", "ginger", "cumin", "garam masala", "cream", "salt", "green chili"],
        instructions="1. Blanch and blend spinach.\n2. Sauté onion, garlic, ginger, tomato.\n3. Add spinach paste, paneer, cream.\n4. Simmer and serve with naan.",
        nutrition=RecipeNutrition(calories=250, protein_g=16, carbs_g=12, fat_g=16), diets=["vegetarian", "gluten-free", "high-protein"]),
    RecipeItem(id="r-8", title="Rajma Chawal", image_url="https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400",
        summary="Hearty kidney bean curry cooked in thick tomato-onion gravy — a Sunday lunch essential.", ready_in_minutes=40, servings=4,
        ingredients=["rajma", "rice", "onion", "tomato", "ginger", "garlic", "cumin", "coriander powder", "garam masala", "oil", "salt"],
        instructions="1. Soak and pressure cook rajma.\n2. Sauté onion, ginger-garlic, add tomato.\n3. Add rajma, simmer 15 min.\n4. Serve over steamed rice.",
        nutrition=RecipeNutrition(calories=380, protein_g=16, carbs_g=58, fat_g=7), diets=["vegetarian", "gluten-free", "high-protein"]),
    RecipeItem(id="r-9", title="Chole Bhature", image_url="https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400",
        summary="Spicy chickpea curry served with fluffy deep-fried bread — a beloved North Indian feast.", ready_in_minutes=50, servings=4,
        ingredients=["chickpeas", "maida", "curd", "onion", "tomato", "ginger", "garlic", "cumin", "coriander powder", "amchur", "oil", "salt"],
        instructions="1. Cook chickpeas, make chole gravy.\n2. Knead maida dough with curd.\n3. Roll and deep fry bhature.\n4. Serve with pickle and onion.",
        nutrition=RecipeNutrition(calories=420, protein_g=14, carbs_g=52, fat_g=18), diets=["vegetarian"]),
    RecipeItem(id="r-10", title="Dahi Vada", image_url="https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400",
        summary="Soft lentil dumplings soaked in sweetened curd with tangy-spicy chutneys.", ready_in_minutes=40, servings=4,
        ingredients=["urad dal", "curd", "cumin", "red chili powder", "tamarind chutney", "green chutney", "salt", "oil", "black salt"],
        instructions="1. Grind urad dal, fry vadas.\n2. Soak in water, squeeze.\n3. Pour sweetened curd over.\n4. Top with chutneys and spices.",
        nutrition=RecipeNutrition(calories=220, protein_g=10, carbs_g=30, fat_g=8), diets=["vegetarian", "gluten-free"]),
    RecipeItem(id="r-11", title="Butter Chicken", image_url="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400",
        summary="Tender chicken in rich tomato-butter-cream gravy — India's most famous curry worldwide.", ready_in_minutes=45, servings=4,
        ingredients=["chicken", "butter", "cream", "tomato", "onion", "garlic", "ginger", "garam masala", "red chili powder", "cumin", "curd", "oil", "salt"],
        instructions="1. Marinate chicken in curd and spices.\n2. Grill or cook chicken.\n3. Make gravy with butter, tomato puree, cream, spices.\n4. Add chicken, simmer 10 min.",
        nutrition=RecipeNutrition(calories=450, protein_g=28, carbs_g=12, fat_g=32), diets=["gluten-free", "high-protein"]),
    RecipeItem(id="r-12", title="Aloo Paratha", image_url="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
        summary="Stuffed flatbread with spiced mashed potato — the king of Indian breakfasts.", ready_in_minutes=30, servings=3,
        ingredients=["atta", "potato", "onion", "green chili", "cumin", "coriander powder", "salt", "ghee", "ginger"],
        instructions="1. Boil and mash potatoes with spices.\n2. Stuff into atta dough.\n3. Roll and cook on tawa with ghee until golden.",
        nutrition=RecipeNutrition(calories=310, protein_g=7, carbs_g=45, fat_g=12), diets=["vegetarian"]),
    RecipeItem(id="r-13", title="Matar Paneer",
        summary="Green peas and paneer cubes in a spiced tomato-onion gravy.", ready_in_minutes=30, servings=3,
        ingredients=["paneer", "peas", "onion", "tomato", "ginger", "garlic", "cumin", "turmeric", "garam masala", "cream", "oil", "salt"],
        instructions="1. Sauté onion, ginger-garlic.\n2. Add tomato puree, spices.\n3. Add peas, paneer, cream.\n4. Simmer and serve with roti.",
        nutrition=RecipeNutrition(calories=280, protein_g=16, carbs_g=18, fat_g=17), diets=["vegetarian", "gluten-free"]),
    RecipeItem(id="r-14", title="Dal Makhani", image_url="https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400",
        summary="Slow-cooked black lentils in butter and cream — rich, velvety, and utterly luxurious.", ready_in_minutes=60, servings=4,
        ingredients=["urad dal", "rajma", "butter", "cream", "onion", "tomato", "garlic", "ginger", "cumin", "garam masala", "red chili powder", "salt"],
        instructions="1. Soak and pressure cook urad dal and rajma.\n2. Sauté onion, ginger-garlic, tomato.\n3. Add dal, butter, cream, simmer on low 30 min.\n4. Finish with garam masala.",
        nutrition=RecipeNutrition(calories=380, protein_g=14, carbs_g=35, fat_g=20), diets=["vegetarian", "gluten-free"]),
    RecipeItem(id="r-15", title="Biryani", image_url="https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400",
        summary="Fragrant layered rice dish with spiced chicken, saffron, and aromatic herbs.", ready_in_minutes=60, servings=5,
        ingredients=["basmati rice", "chicken", "onion", "curd", "ginger", "garlic", "garam masala", "turmeric", "saffron", "mint", "ghee", "salt"],
        instructions="1. Marinate chicken in curd and spices.\n2. Par-boil rice with whole spices.\n3. Layer chicken and rice, top with saffron milk.\n4. Dum cook 25 min.",
        nutrition=RecipeNutrition(calories=520, protein_g=25, carbs_g=60, fat_g=18), diets=["gluten-free", "high-protein"]),

    # ── South Indian ──
    RecipeItem(id="r-16", title="Masala Dosa", image_url="https://images.unsplash.com/photo-1630383249896-424e482df921?w=400",
        summary="Crispy fermented rice-lentil crepe filled with spiced potato masala.", ready_in_minutes=35, servings=3,
        ingredients=["rice", "urad dal", "potato", "onion", "mustard seeds", "curry leaves", "turmeric", "green chili", "oil", "salt"],
        instructions="1. Ferment rice-dal batter overnight.\n2. Make potato masala with mustard, curry leaves, onion.\n3. Spread batter on hot tawa, fill with potato masala.\n4. Serve with sambar and chutney.",
        nutrition=RecipeNutrition(calories=250, protein_g=7, carbs_g=38, fat_g=8), diets=["vegetarian", "gluten-free", "vegan"]),
    RecipeItem(id="r-17", title="Sambar", image_url="https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400",
        summary="Tangy lentil stew with mixed vegetables and tamarind — a South Indian staple.", ready_in_minutes=35, servings=4,
        ingredients=["arhar dal", "tamarind", "onion", "tomato", "carrot", "drumstick", "mustard seeds", "curry leaves", "turmeric", "oil", "salt"],
        instructions="1. Cook arhar dal.\n2. Boil vegetables with tamarind water.\n3. Combine dal and vegetables.\n4. Temper with mustard seeds, curry leaves.",
        nutrition=RecipeNutrition(calories=160, protein_g=8, carbs_g=25, fat_g=3), diets=["vegetarian", "gluten-free", "vegan"]),
    RecipeItem(id="r-18", title="Idli Sambar",
        summary="Soft steamed rice cakes served with lentil stew and coconut chutney.", ready_in_minutes=30, servings=4,
        ingredients=["rice", "urad dal", "arhar dal", "onion", "tomato", "tamarind", "mustard seeds", "curry leaves", "turmeric", "coconut", "salt"],
        instructions="1. Ferment rice-dal batter overnight, steam in moulds for 12 min.\n2. Prepare sambar.\n3. Grind coconut chutney.\n4. Serve together.",
        nutrition=RecipeNutrition(calories=200, protein_g=8, carbs_g=35, fat_g=3), diets=["vegetarian", "gluten-free", "vegan"]),
    RecipeItem(id="r-19", title="Coconut Rice",
        summary="Quick South Indian rice tossed with coconut, peanuts, and curry leaves.", ready_in_minutes=20, servings=3,
        ingredients=["rice", "coconut", "peanuts", "mustard seeds", "curry leaves", "urad dal", "green chili", "oil", "salt", "lemon"],
        instructions="1. Cook rice and cool.\n2. Temper mustard, urad dal, peanuts, curry leaves.\n3. Add grated coconut, mix with rice.\n4. Squeeze lemon, serve.",
        nutrition=RecipeNutrition(calories=280, protein_g=6, carbs_g=40, fat_g=11), diets=["vegetarian", "gluten-free", "vegan"]),
    RecipeItem(id="r-20", title="Upma",
        summary="Semolina porridge tempered with mustard, curry leaves, and vegetables — a quick breakfast.", ready_in_minutes=15, servings=2,
        ingredients=["semolina", "onion", "green chili", "mustard seeds", "curry leaves", "peanuts", "carrot", "peas", "oil", "salt", "lemon"],
        instructions="1. Dry roast semolina.\n2. Temper mustard, curry leaves, peanuts.\n3. Add onion, vegetables, water.\n4. Add semolina, cook until thick.",
        nutrition=RecipeNutrition(calories=210, protein_g=5, carbs_g=32, fat_g=7), diets=["vegetarian", "vegan"]),

    # ── Snacks & Street Food ──
    RecipeItem(id="r-21", title="Pav Bhaji", image_url="https://images.unsplash.com/photo-1606491956689-2ea866880049?w=400",
        summary="Mumbai's iconic spiced mashed vegetable curry served with buttered bread rolls.", ready_in_minutes=35, servings=4,
        ingredients=["potato", "cauliflower", "peas", "bell pepper", "onion", "tomato", "butter", "ginger", "garlic", "pav bhaji masala", "salt", "bread"],
        instructions="1. Boil and mash vegetables.\n2. Sauté onion, tomato, ginger-garlic.\n3. Mix in mashed veggies, butter, pav bhaji masala.\n4. Toast pav in butter, serve.",
        nutrition=RecipeNutrition(calories=350, protein_g=9, carbs_g=45, fat_g=15), diets=["vegetarian"]),
    RecipeItem(id="r-22", title="Samosa",
        summary="Crispy deep-fried pastry filled with spiced potato and peas — India's favorite snack.", ready_in_minutes=45, servings=6,
        ingredients=["maida", "potato", "peas", "cumin", "coriander powder", "garam masala", "green chili", "ginger", "oil", "salt"],
        instructions="1. Make maida dough with oil, rest 30 min.\n2. Mash potato with peas and spices.\n3. Shape cones, fill, seal.\n4. Deep fry until golden.",
        nutrition=RecipeNutrition(calories=260, protein_g=5, carbs_g=30, fat_g=14), diets=["vegetarian", "vegan"]),
    RecipeItem(id="r-23", title="Poha",
        summary="Flattened rice tossed with onion, potato, peanuts, and turmeric — a light breakfast.", ready_in_minutes=15, servings=2,
        ingredients=["poha", "onion", "potato", "peanuts", "mustard seeds", "curry leaves", "turmeric", "green chili", "oil", "salt", "lemon"],
        instructions="1. Wash and drain poha.\n2. Temper mustard, curry leaves, peanuts.\n3. Add onion, potato, turmeric.\n4. Add poha, mix, squeeze lemon.",
        nutrition=RecipeNutrition(calories=190, protein_g=5, carbs_g=30, fat_g=6), diets=["vegetarian", "gluten-free", "vegan"], meal_type="Breakfast"),

    # ── Egg & Non-Veg ──
    RecipeItem(id="r-24", title="Egg Curry",
        summary="Boiled eggs simmered in a spicy onion-tomato gravy — protein-packed comfort food.", ready_in_minutes=25, servings=3,
        ingredients=["eggs", "onion", "tomato", "garlic", "ginger", "cumin", "turmeric", "red chili powder", "garam masala", "oil", "salt"],
        instructions="1. Boil and halve eggs.\n2. Sauté onion, ginger-garlic, tomato.\n3. Add spices and water, simmer.\n4. Add eggs, cook 5 min.",
        nutrition=RecipeNutrition(calories=250, protein_g=16, carbs_g=10, fat_g=16), diets=["gluten-free", "high-protein"], meal_type="Lunch/Dinner"),
    RecipeItem(id="r-25", title="Chicken Curry",
        summary="Classic Indian chicken curry with rich onion-tomato-spice gravy.", ready_in_minutes=40, servings=4,
        ingredients=["chicken", "onion", "tomato", "garlic", "ginger", "cumin", "turmeric", "coriander powder", "garam masala", "oil", "salt", "green chili"],
        instructions="1. Sauté onion until golden.\n2. Add ginger-garlic, tomato, spices.\n3. Add chicken, cook 25 min.\n4. Finish with garam masala.",
        nutrition=RecipeNutrition(calories=380, protein_g=30, carbs_g=10, fat_g=22), diets=["gluten-free", "high-protein"], meal_type="Lunch/Dinner"),
    RecipeItem(id="r-26", title="Fish Fry",
        summary="Crispy pan-fried fish fillets marinated in turmeric, chili, and lemon.", ready_in_minutes=20, servings=2,
        ingredients=["fish", "turmeric", "red chili powder", "salt", "lemon", "garlic", "oil"],
        instructions="1. Marinate fish with turmeric, chili, salt, garlic, lemon.\n2. Rest 15 min.\n3. Shallow fry until crispy on both sides.",
        nutrition=RecipeNutrition(calories=280, protein_g=24, carbs_g=5, fat_g=18), diets=["gluten-free", "high-protein", "keto"], meal_type="Snack"),

    # ── Rice Dishes ──
    RecipeItem(id="r-27", title="Lemon Rice",
        summary="Tangy turmeric rice with peanuts and curry leaves — quick South Indian lunch.", ready_in_minutes=15, servings=3,
        ingredients=["rice", "lemon", "turmeric", "peanuts", "mustard seeds", "curry leaves", "green chili", "oil", "salt"],
        instructions="1. Cook and cool rice.\n2. Temper mustard, peanuts, curry leaves, chili.\n3. Add turmeric, mix in rice and lemon juice.",
        nutrition=RecipeNutrition(calories=240, protein_g=5, carbs_g=38, fat_g=8), diets=["vegetarian", "gluten-free", "vegan"], meal_type="Lunch/Dinner"),
    RecipeItem(id="r-28", title="Jeera Rice",
        summary="Fragrant basmati rice infused with cumin and ghee — perfect with any curry.", ready_in_minutes=20, servings=3,
        ingredients=["basmati rice", "cumin", "ghee", "salt", "bay leaf"],
        instructions="1. Wash and soak rice.\n2. Heat ghee, add cumin and bay leaf.\n3. Add rice and water, cook until fluffy.",
        nutrition=RecipeNutrition(calories=200, protein_g=4, carbs_g=35, fat_g=5), diets=["vegetarian", "gluten-free"], meal_type="Lunch/Dinner"),

    # ── Desserts ──
    RecipeItem(id="r-29", title="Gulab Jamun",
        summary="Soft milk-solid dumplings soaked in fragrant rose-cardamom sugar syrup.", ready_in_minutes=40, servings=6,
        ingredients=["milk powder", "maida", "ghee", "cardamom", "sugar", "rose water", "oil", "baking soda"],
        instructions="1. Mix milk powder, maida, ghee, baking soda into soft dough.\n2. Shape small balls.\n3. Deep fry on low heat until golden.\n4. Soak in warm sugar syrup with cardamom and rose water.",
        nutrition=RecipeNutrition(calories=320, protein_g=4, carbs_g=50, fat_g=12), diets=["vegetarian"], meal_type="Dessert"),
    RecipeItem(id="r-30", title="Kheer",
        summary="Creamy rice pudding slow-cooked in milk with cardamom, saffron, and nuts.", ready_in_minutes=40, servings=4,
        ingredients=["rice", "milk", "sugar", "cardamom", "saffron", "almonds", "cashew", "raisins", "ghee"],
        instructions="1. Boil milk, add washed rice.\n2. Cook on low heat, stirring often, until thick.\n3. Add sugar, cardamom, saffron.\n4. Garnish with fried nuts and raisins.",
        nutrition=RecipeNutrition(calories=280, protein_g=8, carbs_g=42, fat_g=9), diets=["vegetarian", "gluten-free"], meal_type="Dessert"),
]

# ── Load extended recipes from JSON ────────────────────────────
_extra_path = Path(__file__).parent.parent / "recipes_extra.json"
if _extra_path.exists():
    with open(_extra_path) as _f:
        _extra_recipes = json.load(_f)
    for _r in _extra_recipes:
        _nutr = _r.get("nutrition", {})
        DEMO_RECIPES.append(RecipeItem(
            id=_r["id"], title=_r["title"], summary=_r.get("summary", ""),
            ready_in_minutes=_r.get("ready_in_minutes"),
            servings=_r.get("servings"),
            ingredients=_r.get("ingredients", []),
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
