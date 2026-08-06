"""
ORM models — User authentication + recipe storage.
"""

from datetime import datetime, timezone

from sqlalchemy import Integer, String, Float, DateTime, Text, ForeignKey, Boolean, UniqueConstraint
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
    health_conditions: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Comma-separated: diabetes,hypertension,high_cholesterol,etc.
    taste_preferences: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Comma-separated: spicy,mild,sweet,savory,tangy,smoky
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


class WeightLog(Base):
    """A user's logged daily weight for adaptive TDEE calculation."""
    __tablename__ = "weight_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    logged_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationship
    owner: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<WeightLog id={self.id} weight={self.weight_kg}kg date={self.date}>"


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


class RecipeReview(Base):
    """Text review, rating (1-5 stars), and cooking tips for any recipe."""
    __tablename__ = "recipe_reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "recipe_id", "recipe_source", name="uq_user_recipe_review"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipe_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    recipe_source: Mapped[str] = mapped_column(String(50), nullable=False, default="catalog")  # catalog, spoonacular, community
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 5 stars
    review_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    tip_category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # General, Substitution, Cooking Technique
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationship
    owner: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<RecipeReview id={self.id} recipe={self.recipe_id!r} rating={self.rating}>"


# ── Phase 2: Social Feed Models ────────────────────────────────

class CommunityPost(Base):
    """Social feed post (text + optional photo + optional linked recipe)."""
    __tablename__ = "community_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    recipe_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    recipe_source: Mapped[str | None] = mapped_column(String(50), nullable=True, default="catalog")
    group_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("community_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    likes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    owner: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<CommunityPost id={self.id} user_id={self.user_id}>"


class CommunityComment(Base):
    """Comment on a social feed post."""
    __tablename__ = "community_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    owner: Mapped["User"] = relationship("User")
    post: Mapped["CommunityPost"] = relationship("CommunityPost")

    def __repr__(self) -> str:
        return f"<CommunityComment id={self.id} post_id={self.post_id}>"


class CommunityLike(Base):
    """User like on a social feed post."""
    __tablename__ = "community_likes"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_user_like"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )


class CommunityFollow(Base):
    """User-to-user follow relationship."""
    __tablename__ = "community_follows"
    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_user_follow"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    follower_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    following_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )


# ── Phase 3: User-Submitted Recipes Models ──────────────────────

class CommunityRecipe(Base):
    """User-created recipe submission with moderation workflow."""
    __tablename__ = "community_recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submitter_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    ready_in_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    servings: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    ingredients: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    diets: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Comma-separated
    meal_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    calories: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fiber_g: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    sodium_mg: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    sugar_g: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    nutri_score_grade: Mapped[str | None] = mapped_column(String(2), nullable=True)
    nutri_score_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    moderation_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)  # pending, approved, rejected
    moderation_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    submitter: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<CommunityRecipe id={self.id} title={self.title!r} status={self.moderation_status}>"


# ── Phase 4: Groups & Challenges Models ─────────────────────────

class CommunityGroup(Base):
    """Culinary interest group."""
    __tablename__ = "community_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="Diet")
    creator_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    members_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    creator: Mapped["User"] = relationship("User")


class CommunityGroupMember(Base):
    """Group membership mapping."""
    __tablename__ = "community_group_members"
    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("community_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )


class CommunityChallenge(Base):
    """Time-boxed nutrition or habit challenge."""
    __tablename__ = "community_challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    metric_type: Mapped[str] = mapped_column(String(50), nullable=False)  # protein_target_days, nutri_score_count, water_target_days, recipes_logged
    target_value: Mapped[float] = mapped_column(Float, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    end_date: Mapped[str] = mapped_column(String(10), nullable=False)    # YYYY-MM-DD
    badge_icon: Mapped[str] = mapped_column(String(100), nullable=False, default="🏆")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )


class CommunityChallengeParticipant(Base):
    """User challenge progress tracking."""
    __tablename__ = "community_challenge_participants"
    __table_args__ = (
        UniqueConstraint("challenge_id", "user_id", name="uq_challenge_participant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    challenge_id: Mapped[int] = mapped_column(Integer, ForeignKey("community_challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    current_progress: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)





