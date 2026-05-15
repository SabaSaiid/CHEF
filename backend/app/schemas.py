"""
Pydantic schemas — all request/response models in one file.
"""

from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ── Authentication ──────────────────────────────────────────────

class UserSignupRequest(BaseModel):
    username: str = Field(
        ..., min_length=3, max_length=50, description="Unique username",
        json_schema_extra={"example": "chef_user"}
    )
    email: EmailStr = Field(
        ..., description="Valid email address",
        json_schema_extra={"example": "user@example.com"}
    )
    password: str = Field(
        ..., min_length=6, max_length=128, description="Password (min 6 characters)",
        json_schema_extra={"example": "securepassword123"}
    )


class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, json_schema_extra={"example": "chef_user"})
    password: str = Field(..., min_length=1, json_schema_extra={"example": "securepassword123"})


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    user_id: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str

    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None

    target_calories: Optional[int] = None
    target_protein: Optional[int] = None
    target_carbs: Optional[int] = None
    target_fat: Optional[int] = None


# ── TDEE Calculator ─────────────────────────────────────────────

class TDEERequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "age": 25,
                "gender": "female",
                "weight_kg": 60.0,
                "height_cm": 165.0,
                "activity_level": "moderately_active",
                "goal": "lose"
            }
        }
    )

    age: int = Field(..., gt=0, lt=120, description="Age in years")
    gender: str = Field(..., pattern="^(male|female)$", description="male or female")
    weight_kg: float = Field(..., gt=0, description="Weight in kg")
    height_cm: float = Field(..., gt=0, description="Height in cm")
    activity_level: str = Field(
        ...,
        description="sedentary | lightly_active | moderately_active | very_active | extra_active"
    )
    goal: str = Field(..., description="lose | maintain | gain")


class TDEEResponse(BaseModel):
    target_calories: int
    target_protein: int
    target_carbs: int
    target_fat: int


# ── Ingredients ─────────────────────────────────────────────────

class IngredientItem(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    raw_text: str = ""
    substitutes: list[str] = []


class IngredientParseRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "2 cups flour, 3 eggs, 1 lb chicken breast, 200g spinach"
            }
        }
    )
    text: str = Field(..., min_length=1, max_length=2000, description="Raw ingredient text to parse")


class IngredientParseResult(BaseModel):
    original_text: str
    ingredients: list[IngredientItem] = []
    ingredient_names: list[str] = []
    parser: str = "rule_based"


# ── Recipes ─────────────────────────────────────────────────────

class RecipeNutrition(BaseModel):
    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0


class RecipeItem(BaseModel):
    id: str
    title: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    summary: Optional[str] = None
    ready_in_minutes: Optional[int] = None
    servings: Optional[int] = None
    ingredients: list[str] = []
    instructions: Optional[str] = None
    source_url: Optional[str] = None
    nutrition: Optional[RecipeNutrition] = None
    diets: list[str] = []
    meal_type: Optional[str] = None
    region: Optional[str] = None
    popularity: int = 0
    match_score: float = 0.0


class RecipeSearchRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ingredients": ["chicken", "spinach", "garlic"],
                "max_results": 10,
                "max_calories": 600,
                "max_time": 45,
                "diet": "non-vegetarian",
                "region": "Bihar",
                "meal_type": "Dinner"
            }
        }
    )

    ingredients: list[str] = Field(default_factory=list)
    max_results: int = Field(10, ge=1, le=50)
    # ── Constraints ──
    max_calories: Optional[int] = Field(None, ge=50, le=5000, description="Max calories per serving")
    max_time: Optional[int] = Field(None, ge=5, le=300, description="Max cook time in minutes")
    diet: Optional[str] = Field(
        None,
        description="vegetarian | vegan | keto | gluten-free | high-protein | non-vegetarian"
    )
    region: Optional[str] = Field(None, description="Region filter e.g. Bihar, Punjab, South Indian")
    meal_type: Optional[str] = Field(None, description="Breakfast | Lunch | Dinner | Snack")


class RecipeSearchResponse(BaseModel):
    recipes: list[RecipeItem] = []
    source: str = "demo"
    total: int = 0
    constraints_applied: list[str] = []


class SaveRecipeRequest(BaseModel):
    title: str
    image_url: Optional[str] = None
    summary: Optional[str] = None
    ingredients: Optional[str] = None
    instructions: Optional[str] = None
    source_url: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    ready_in_minutes: Optional[int] = None
    servings: Optional[int] = None


class RecipeRateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1 to 5")


class SavedRecipeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    image_url: Optional[str] = None
    summary: Optional[str] = None
    ingredients: Optional[str] = None
    instructions: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    ready_in_minutes: Optional[int] = None
    servings: Optional[int] = None
    rating: Optional[int] = None


# ── Nutrition ───────────────────────────────────────────────────

class NutritionRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "food_item": "chicken breast",
                "quantity": 1.5,
                "unit": "serving"
            }
        }
    )
    food_item: str = Field(..., min_length=1, description="Food name to look up")
    quantity: float = Field(1.0, ge=0.1, description="Multiplier for the quantity")
    unit: str = Field("serving", description="Unit label (for display only)")


class NutritionData(BaseModel):
    food_item: str
    quantity: float
    unit: str
    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    source: str = "demo"


# ── Detection ───────────────────────────────────────────────────

class DetectedFood(BaseModel):
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0, description="YOLOv8 confidence score (0–1)")
    ingredient: str


class DetectionResult(BaseModel):
    detected_foods: list[DetectedFood] = []
    ingredients: list[str] = []
    message: str = "Detection complete"
    method: str = "rule_based_demo"


# ── Meal Planner ────────────────────────────────────────────────

class MealPlanCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "recipe_id": 1,
                "date": "2026-05-16",
                "meal_slot": "Dinner"
            }
        }
    )
    recipe_id: int
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")
    meal_slot: str = Field(..., pattern="^(Breakfast|Lunch|Dinner|Snack)$")


class MealPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    recipe_id: int
    date: str
    meal_slot: str
    recipe: Optional[SavedRecipeResponse] = None


class ShoppingListItem(BaseModel):
    ingredient: str
    count: int
    recipes_used_in: list[str] = []
