"""
ORM models — User authentication + recipe storage.
"""

from datetime import datetime, timezone

from sqlalchemy import Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """Registered user with hashed password."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    
    # ── TDEE Profile Data ─────────────────────────────────────
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    goal: Mapped[str | None] = mapped_column(String(50), nullable=True)
    goal_intensity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    body_fat_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Calculated Targets
    target_calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_protein: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_carbs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_fat: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bmr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tdee_maintenance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_fiber_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_water_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)


    # Relationship: a user has many saved recipes
    saved_recipes: Mapped[list["SavedRecipe"]] = relationship(
        "SavedRecipe", back_populates="owner", cascade="all, delete-orphan"
    )

    # Relationship: a user has many named profiles
    profiles: Mapped[list["UserProfile"]] = relationship(
        "UserProfile", back_populates="owner", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r}>"


class SavedRecipe(Base):
    """A recipe saved/bookmarked by a specific user."""
    __tablename__ = "saved_recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingredients: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    protein_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    ready_in_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    servings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    saved_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationship: each saved recipe belongs to a user
    owner: Mapped["User"] = relationship("User", back_populates="saved_recipes")

    def __repr__(self) -> str:
        return f"<SavedRecipe id={self.id} title={self.title!r}>"


class MealPlan(Base):
    """A user's planned meal linking a specific recipe to a date and slot."""
    __tablename__ = "meal_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipe_id: Mapped[int] = mapped_column(Integer, ForeignKey("saved_recipes.id"), nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # Format: YYYY-MM-DD
    meal_slot: Mapped[str] = mapped_column(String(20), nullable=False)  # Breakfast, Lunch, Dinner, Snack

    # Relationships
    owner: Mapped["User"] = relationship("User")
    recipe: Mapped["SavedRecipe"] = relationship("SavedRecipe")

    def __repr__(self) -> str:
        return f"<MealPlan id={self.id} date={self.date} slot={self.meal_slot}>"


class NutritionLog(Base):
    """A user's daily food intake log entry for nutrition tracking."""
    __tablename__ = "nutrition_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    food_item: Mapped[str] = mapped_column(String(255), nullable=False)
    calories: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fiber_g: Mapped[float] = mapped_column(Float, nullable=True, default=0)
    quantity: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="serving")
    meal_slot: Mapped[str] = mapped_column(String(20), nullable=False, default="Snack")  # Breakfast, Lunch, Dinner, Snack
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    logged_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationship
    owner: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<NutritionLog id={self.id} food={self.food_item!r} date={self.date}>"


class UserProfile(Base):
    """
    Named nutrition/fitness profile for a user.
    A single account can have multiple profiles (e.g. 'Cutting Phase', 'Bulk 2024').
    Only one profile per user is active at a time.
    """
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # ── Identity ──────────────────────────────────────────────────
    profile_name: Mapped[str] = mapped_column(String(100), nullable=False, default="My Profile")
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    diet_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # vegetarian | vegan | non-vegetarian | etc.
    allergens: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Comma-separated list of allergens
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Physical Attributes ───────────────────────────────────────
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    goal: Mapped[str | None] = mapped_column(String(50), nullable=True)
    goal_intensity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    body_fat_percent: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── Calculated Targets ────────────────────────────────────────
    target_calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_protein: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_carbs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_fat: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bmr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tdee_maintenance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_fiber_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_water_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationship: each profile belongs to a user
    owner: Mapped["User"] = relationship("User", back_populates="profiles")

    def __repr__(self) -> str:
        return f"<UserProfile id={self.id} name={self.profile_name!r} active={self.is_active}>"


class WaterLog(Base):
    """A user's logged water intake in ml for hydration tracking."""
    __tablename__ = "water_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    logged_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationship
    owner: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<WaterLog id={self.id} amount={self.amount_ml}ml date={self.date}>"


class PantryItem(Base):
    """A user's inventory of ingredients currently in stock at home."""
    __tablename__ = "pantry_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ingredient_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    quantity: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="serving")
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Other")
    days_fresh: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    owner: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<PantryItem id={self.id} ingredient={self.ingredient_name!r} qty={self.quantity}>"



