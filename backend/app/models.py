"""
ORM models — User authentication + recipe storage.
"""

from datetime import datetime, timezone

from sqlalchemy import Integer, String, Float, DateTime, Text, ForeignKey
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
    
    # Calculated Targets
    target_calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_protein: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_carbs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_fat: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationship: a user has many saved recipes
    saved_recipes: Mapped[list["SavedRecipe"]] = relationship(
        "SavedRecipe", back_populates="owner", cascade="all, delete-orphan"
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
