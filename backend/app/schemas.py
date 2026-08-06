"""
Pydantic schemas — all request/response models in one file.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator, model_validator


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
        ..., min_length=8, max_length=128,
        description="Password (min 8 chars, must include uppercase, lowercase, and digit)",
        json_schema_extra={"example": "SecurePass1"}
    )

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Enforce password complexity — OWASP minimum requirements."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


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
    goal_intensity: Optional[str] = None
    body_fat_percent: Optional[float] = None

    target_calories: Optional[int] = None
    target_protein: Optional[int] = None
    target_carbs: Optional[int] = None
    target_fat: Optional[int] = None
    bmr: Optional[int] = None
    tdee_maintenance: Optional[int] = None
    bmi: Optional[float] = None
    target_fiber_g: Optional[int] = None
    target_water_ml: Optional[int] = None


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
                "goal": "lose",
                "goal_intensity": "moderate",
                "body_fat_percent": None
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
    goal_intensity: str = Field(
        "moderate",
        description="mild | moderate | aggressive — controls deficit/surplus percentage"
    )
    body_fat_percent: Optional[float] = Field(
        None, gt=1, lt=70,
        description="Optional body fat %. Enables the more accurate Katch-McArdle formula."
    )


class TDEEResponse(BaseModel):
    # ── Core targets ──
    target_calories: int
    target_protein: int
    target_carbs: int
    target_fat: int
    # ── Diagnostic breakdown ──
    bmr: int = Field(..., description="Basal Metabolic Rate (kcal)")
    tdee_maintenance: int = Field(..., description="Maintenance TDEE before goal adjustment (kcal)")
    bmi: float = Field(..., description="Body Mass Index")
    bmi_category: str = Field(..., description="Underweight | Normal | Overweight | Obese I | Obese II | Obese III")
    formula_used: str = Field(..., description="Mifflin-St Jeor or Katch-McArdle")
    # ── Additional real-world targets ──
    target_fiber_g: int = Field(..., description="Daily fiber target (g)")
    target_water_ml: int = Field(..., description="Daily water target (ml)")
    # ── Macro split info ──
    protein_pct: int = Field(..., description="Protein % of total calories")
    carbs_pct: int = Field(..., description="Carbs % of total calories")
    fat_pct: int = Field(..., description="Fat % of total calories")
    protein_per_kg: float = Field(..., description="Protein grams per kg body weight")
    recommended_goal: Optional[str] = Field(None, description="Recommended goal based on BMI: lose | maintain | gain")
    recommendation_reason: Optional[str] = Field(None, description="Explanation for recommendation")


# ── Ingredients ─────────────────────────────────────────────────

class IngredientSubstitute(BaseModel):
    vegan: Optional[list[str]] = None
    healthy: Optional[list[str]] = None
    baking: Optional[list[str]] = None
    general: Optional[list[str]] = None
    gluten_free: Optional[list[str]] = None
    allergy_friendly: Optional[list[str]] = None
    notes: Optional[str] = None

class IngredientItem(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    raw_text: str = ""
    substitutes: Optional[IngredientSubstitute] = None


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


class SupplementaryBadgesSchema(BaseModel):
    nak_ratio: Optional[dict] = None
    nova_upf: Optional[dict] = None
    glycemic_load: Optional[dict] = None


class NutriScoreResponse(BaseModel):
    """Nutri-Score rating for a recipe."""
    grade: str = Field(..., description="Nutri-Score grade: S | A | B | C | D | E")
    numeric_score: int = Field(..., description="Raw NPS score (negative - positive)")
    label: str = Field("", description="Display label (e.g. '★ S', 'A')")
    color_bg: str = Field("", description="Badge background color hex")
    color_text: str = Field("", description="Badge text color hex")
    description: str = Field("", description="Human-readable tier description")
    category: str = Field("general", description="Scoring category used")
    negative_total: int = Field(0, description="Sum of negative points (0-40)")
    confidence: Optional[str] = Field("high", description="Weight parsing confidence: high | medium | low")
    algorithm_version: Optional[str] = Field("1.0.0", description="Scoring algorithm version")
    supplementary_badges: Optional[SupplementaryBadgesSchema] = None


ChefScoreResponse = NutriScoreResponse


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
    nutri_score: Optional[NutriScoreResponse] = None
    chef_score: Optional[NutriScoreResponse] = None
    supplementary_badges: Optional[SupplementaryBadgesSchema] = None
    diets: list[str] = []
    meal_type: Optional[str] = None
    region: Optional[str] = None
    popularity: float = 0
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
    max_results: int = Field(25, ge=1, le=50)
    page: int = Field(1, ge=1, description="Page number for search results")
    # ── Constraints ──
    max_calories: Optional[int] = Field(None, ge=50, le=5000, description="Max calories per serving")
    max_time: Optional[int] = Field(None, ge=5, le=300, description="Max cook time in minutes")
    diet: Optional[str] = Field(
        None,
        description="vegetarian | vegan | keto | gluten-free | high-protein | non-vegetarian"
    )
    region: Optional[str] = Field(None, description="Region filter e.g. Bihar, Punjab, South Indian")
    meal_type: Optional[str] = Field(None, description="Breakfast | Lunch | Dinner | Snack")
    sort_by: Optional[str] = Field(None, description="best_match | fastest | lowest_calories | highest_protein | healthiest")
    min_nutri_score: Optional[str] = Field(
        None,
        description="Minimum Nutri-Score grade filter: S | A | B | C | D | E. Only shows recipes at or above this grade."
    )
    min_chef_score: Optional[str] = Field(
        None,
        description="Alias for min_nutri_score."
    )


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
    fiber_g: Optional[float] = 0.0
    sugar_g: Optional[float] = 0.0
    sodium_mg: Optional[float] = 0.0
    potassium_mg: Optional[float] = 0.0
    calcium_mg: Optional[float] = 0.0
    iron_mg: Optional[float] = 0.0
    vitamin_c_mg: Optional[float] = 0.0
    saturated_fat_g: Optional[float] = 0.0
    serving_weight_g: Optional[float] = 100.0
    glycemic_index: Optional[int] = None
    health_score: Optional[int] = 85
    tags: Optional[list[str]] = None
    source: str = "USDA / ICMR-NIN Verified DB"
    found: bool = True
    matched_food: Optional[str] = None
    suggestions: Optional[list[str]] = None




# ── Detection ───────────────────────────────────────────────────

class BoundingBox(BaseModel):
    """Bounding box coordinates (normalized 0–1 relative to image dimensions)."""
    x1: float = Field(..., description="Left edge (0–1)")
    y1: float = Field(..., description="Top edge (0–1)")
    x2: float = Field(..., description="Right edge (0–1)")
    y2: float = Field(..., description="Bottom edge (0–1)")


class DetectedFood(BaseModel):
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence score (0–1)")
    ingredient: str
    bbox: Optional[BoundingBox] = None
    estimated_portion_g: Optional[float] = Field(None, description="Estimated portion weight in grams")
    estimated_calories: Optional[float] = Field(None, description="Estimated calories based on portion size")


class DetectionResult(BaseModel):
    detected_foods: list[DetectedFood] = []
    ingredients: list[str] = []
    message: str = "Detection complete"
    method: str = "rule_based_demo"
    model_version: str = "basic"
    total_estimated_calories: Optional[float] = Field(None, description="Sum of all estimated calories")



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


# ── Nutrition Tracker ───────────────────────────────────────────

class NutritionLogCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "food_item": "chicken breast",
                "calories": 165,
                "protein_g": 31,
                "carbs_g": 0,
                "fat_g": 3.6,
                "fiber_g": 0,
                "quantity": 1.5,
                "unit": "serving",
                "meal_slot": "Lunch",
                "date": "2026-06-12"
            }
        }
    )
    food_item: str = Field(..., min_length=1, max_length=255, description="Name of the food item")
    calories: float = Field(0, ge=0, description="Calories (kcal)")
    protein_g: float = Field(0, ge=0, description="Protein (g)")
    carbs_g: float = Field(0, ge=0, description="Carbohydrates (g)")
    fat_g: float = Field(0, ge=0, description="Fat (g)")
    fiber_g: Optional[float] = Field(0, ge=0, description="Fiber (g)")
    quantity: float = Field(1.0, gt=0, description="Quantity multiplier")
    unit: str = Field("serving", max_length=50, description="Unit of measurement")
    meal_slot: str = Field(
        "Snack",
        pattern="^(Breakfast|Lunch|Dinner|Snack)$",
        description="Meal slot: Breakfast | Lunch | Dinner | Snack",
    )
    date: Optional[str] = Field(
        None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Date in YYYY-MM-DD format. Defaults to today.",
    )


class NutritionLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    food_item: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: Optional[float] = 0
    quantity: float
    unit: str
    meal_slot: str
    date: str


class DailyNutritionSummary(BaseModel):
    date: str
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_fiber_g: float = 0
    items_logged: int


# ── User Profiles (Multi-Profile System) ────────────────────────

class UserProfileCreate(BaseModel):
    """Request body to create a new named profile."""
    profile_name: str = Field("My Profile", min_length=1, max_length=100, description="A human-readable label for this profile")
    display_name: Optional[str] = Field(None, max_length=100, description="Real name to display across the app")
    diet_type: Optional[str] = Field(
        None,
        description="vegetarian | vegan | non-vegetarian | pescatarian | keto | gluten-free"
    )
    allergens: Optional[str] = Field(None, description="Comma-separated list of allergens")
    health_conditions: Optional[str] = Field(None, description="Comma-separated: diabetes,hypertension,hypotension,high_cholesterol,pcos,kidney_disease,thyroid,anemia")
    taste_preferences: Optional[str] = Field(None, description="Comma-separated: spicy,mild,sweet,savory,tangy,smoky")
    age: Optional[int] = Field(None, gt=0, lt=120)
    gender: Optional[str] = Field(None, pattern="^(male|female)$")
    weight_kg: Optional[float] = Field(None, gt=0)
    height_cm: Optional[float] = Field(None, gt=0)
    activity_level: Optional[str] = None
    goal: Optional[str] = None
    goal_intensity: Optional[str] = Field("moderate", description="mild | moderate | aggressive")
    body_fat_percent: Optional[float] = Field(None, gt=1, lt=70)


class UserProfileUpdate(UserProfileCreate):
    """Request body to update an existing profile (same fields, all optional)."""
    pass


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    profile_name: str
    display_name: Optional[str] = None
    diet_type: Optional[str] = None
    allergens: Optional[str] = None
    health_conditions: Optional[str] = None
    taste_preferences: Optional[str] = None
    is_active: bool

    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None
    goal_intensity: Optional[str] = None
    body_fat_percent: Optional[float] = None

    target_calories: Optional[int] = None
    target_protein: Optional[int] = None
    target_carbs: Optional[int] = None
    target_fat: Optional[int] = None
    bmr: Optional[int] = None
    tdee_maintenance: Optional[int] = None
    target_fiber_g: Optional[int] = None
    target_water_ml: Optional[int] = None
    protein_pct: Optional[int] = None
    carbs_pct: Optional[int] = None
    fat_pct: Optional[int] = None

    @model_validator(mode="after")
    def compute_macro_percentages(self):
        if self.target_calories and self.target_calories > 0 and (self.target_protein or self.target_carbs or self.target_fat):
            from app.routers.tdee import calculate_macro_percentages
            p, c, f = calculate_macro_percentages(
                self.target_protein,
                self.target_carbs,
                self.target_fat,
                self.target_calories
            )
            self.protein_pct = p
            self.carbs_pct = c
            self.fat_pct = f
        return self


# ── Water Logs (Hydration Tracking) ─────────────────────────────

class WaterLogCreate(BaseModel):
    """Request body to log water consumption."""
    amount_ml: int = Field(..., gt=0, description="Amount of water logged in ml")
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")

class WaterLogUpdate(BaseModel):
    """Request body to update a water log entry."""
    amount_ml: int = Field(..., gt=0, description="Updated amount of water logged in ml")

class WaterLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount_ml: int
    date: str
    logged_at: datetime


# ── Weight Logs (Adaptive TDEE Tracking) ─────────────────────────

class WeightLogCreate(BaseModel):
    """Request body to log daily weight."""
    weight_kg: float = Field(..., gt=0, description="Weight in kg")
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")

class WeightLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    weight_kg: float
    date: str
    logged_at: datetime


# ── Pantry Inventory ──────────────────────────────────────────

class PantryItemCreate(BaseModel):
    ingredient_name: str = Field(..., min_length=1, max_length=255, description="Name of the ingredient")
    quantity: float = Field(1.0, gt=0, description="Amount of the item in stock")
    unit: str = Field("serving", min_length=1, max_length=50, description="Unit of measurement")
    category: Optional[str] = Field("Other", description="Ingredient category (Vegetables, Proteins, Dairy, etc.)")
    days_fresh: Optional[int] = Field(7, description="Number of days the item stays fresh")

class PantryItemUpdate(BaseModel):
    quantity: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    category: Optional[str] = None
    days_fresh: Optional[int] = None

class PantryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    ingredient_name: str
    quantity: float
    unit: str
    category: str
    days_fresh: int
    updated_at: datetime


# ── Recipe Reviews & Tips ──────────────────────────────────────

class RecipeReviewCreate(BaseModel):
    recipe_id: str = Field(..., min_length=1, max_length=255, description="Recipe identifier")
    recipe_source: str = Field("catalog", description="catalog, spoonacular, or community")
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1 to 5")
    review_text: Optional[str] = Field(None, max_length=2000, description="Text review or cooking tip")
    tip_category: Optional[str] = Field("General", max_length=50, description="General, Substitution, Cooking Technique")


class RecipeReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    username: str
    recipe_id: str
    recipe_source: str
    rating: int
    review_text: Optional[str] = None
    tip_category: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RecipeReviewSummary(BaseModel):
    recipe_id: str
    recipe_source: str
    average_rating: float = 0.0
    total_reviews: int = 0
    rating_distribution: dict[int, int] = Field(default_factory=lambda: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0})


# ── Social Feed ────────────────────────────────────────────────

class PostCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Post text caption")
    image_url: Optional[str] = Field(None, max_length=1000, description="Optional image URL")
    recipe_id: Optional[str] = Field(None, max_length=255, description="Optional attached recipe ID")
    recipe_source: Optional[str] = Field("catalog", description="catalog, spoonacular, or community")
    group_id: Optional[int] = Field(None, description="Optional group ID")


class CommentCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000, description="Comment text")


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    user_id: int
    username: str
    content: str
    created_at: datetime


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    username: str
    content: str
    image_url: Optional[str] = None
    recipe_id: Optional[str] = None
    recipe_source: Optional[str] = None
    group_id: Optional[int] = None
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False
    is_author: bool = False
    created_at: datetime


class UserCommunityProfile(BaseModel):
    user_id: int
    username: str
    posts_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False
    recent_posts: list[PostResponse] = Field(default_factory=list)


# ── User-Submitted Recipes ──────────────────────────────────────

class CommunityRecipeCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    summary: Optional[str] = Field(None, max_length=2000)
    image_url: Optional[str] = Field(None, max_length=1000)
    ready_in_minutes: int = Field(30, ge=1, le=1440)
    servings: int = Field(4, ge=1, le=100)
    ingredients: list[str] = Field(..., min_items=1, description="List of ingredient strings")
    instructions: str = Field(..., min_length=10, description="Step by step preparation instructions")
    diets: Optional[list[str]] = Field(default_factory=list)
    meal_type: Optional[str] = Field("Lunch/Dinner")
    region: Optional[str] = Field("International")
    calories: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    carbs_g: float = Field(..., ge=0)
    fat_g: float = Field(..., ge=0)
    fiber_g: Optional[float] = Field(0.0, ge=0)
    sodium_mg: Optional[float] = Field(0.0, ge=0)
    sugar_g: Optional[float] = Field(0.0, ge=0)


class CommunityRecipeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submitter_id: int
    submitter_username: str
    title: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    ready_in_minutes: int
    servings: int
    ingredients: list[str]
    instructions: str
    diets: list[str]
    meal_type: Optional[str] = None
    region: Optional[str] = None
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: Optional[float] = 0.0
    nutri_score_grade: Optional[str] = None
    nutri_score_points: Optional[int] = None
    moderation_status: str
    moderation_note: Optional[str] = None
    created_at: datetime


# ── Groups & Challenges ────────────────────────────────────────

class CommunityGroupCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10, max_length=2000)
    category: str = Field("Diet", max_length=50)


class CommunityGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str
    category: str
    creator_id: Optional[int] = None
    members_count: int = 1
    is_member: bool = False
    created_at: datetime


class CommunityChallengeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    metric_type: str
    target_value: float
    duration_days: int
    start_date: str
    end_date: str
    badge_icon: str
    is_joined: bool = False
    current_progress: float = 0.0
    is_completed: bool = False





