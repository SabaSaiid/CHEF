"""
Pydantic schemas — all request/response models in one file.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ── Ingredients ─────────────────────────────────────────────────

class IngredientItem(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    raw_text: str = ""


class IngredientParseRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Raw ingredient text to parse")


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
    summary: Optional[str] = None
    ready_in_minutes: Optional[int] = None
    servings: Optional[int] = None
    ingredients: list[str] = []
    instructions: Optional[str] = None
    source_url: Optional[str] = None
    nutrition: Optional[RecipeNutrition] = None
    diets: list[str] = []
    match_score: float = 0.0


class RecipeSearchRequest(BaseModel):
    ingredients: list[str] = Field(..., min_length=1)
    max_results: int = Field(10, ge=1, le=50)
    # ── Constraints ──
    max_calories: Optional[int] = Field(None, ge=50, le=5000, description="Max calories per serving")
    max_time: Optional[int] = Field(None, ge=5, le=300, description="Max cook time in minutes")
    diet: Optional[str] = Field(None, description="Dietary filter: vegetarian, vegan, keto, gluten-free, high-protein")


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


class SavedRecipeResponse(BaseModel):
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

    class Config:
        from_attributes = True


# ── Nutrition ───────────────────────────────────────────────────

class NutritionRequest(BaseModel):
    food_item: str = Field(..., min_length=1)
    quantity: float = Field(1.0, ge=0.1)
    unit: str = "serving"


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
    confidence: float = Field(..., ge=0.0, le=1.0)
    ingredient: str


class DetectionResult(BaseModel):
    detected_foods: list[DetectedFood] = []
    ingredients: list[str] = []
    message: str = "Detection complete"
    method: str = "rule_based_demo"
