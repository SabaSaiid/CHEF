"""Initial schema — all 4 CHEF tables

Revision ID: 0001
Revises: None
Create Date: 2026-06-14

Creates:
  - users (auth + TDEE profile)
  - saved_recipes (bookmarked recipes)
  - meal_plans (weekly planner)
  - nutrition_logs (daily food tracker)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        # TDEE profile
        sa.Column("age", sa.Integer, nullable=True),
        sa.Column("gender", sa.String(10), nullable=True),
        sa.Column("weight_kg", sa.Float, nullable=True),
        sa.Column("height_cm", sa.Float, nullable=True),
        sa.Column("activity_level", sa.String(50), nullable=True),
        sa.Column("goal", sa.String(50), nullable=True),
        sa.Column("goal_intensity", sa.String(20), nullable=True),
        sa.Column("body_fat_percent", sa.Float, nullable=True),
        # Calculated targets
        sa.Column("target_calories", sa.Integer, nullable=True),
        sa.Column("target_protein", sa.Integer, nullable=True),
        sa.Column("target_carbs", sa.Integer, nullable=True),
        sa.Column("target_fat", sa.Integer, nullable=True),
        sa.Column("bmr", sa.Integer, nullable=True),
        sa.Column("tdee_maintenance", sa.Integer, nullable=True),
        sa.Column("bmi", sa.Float, nullable=True),
        sa.Column("target_fiber_g", sa.Integer, nullable=True),
        sa.Column("target_water_ml", sa.Integer, nullable=True),
    )

    # ── saved_recipes ──────────────────────────────────────────
    op.create_table(
        "saved_recipes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("image_url", sa.String(1000), nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("ingredients", sa.Text, nullable=True),
        sa.Column("instructions", sa.Text, nullable=True),
        sa.Column("source_url", sa.String(1000), nullable=True),
        sa.Column("calories", sa.Float, nullable=True),
        sa.Column("protein_g", sa.Float, nullable=True),
        sa.Column("carbs_g", sa.Float, nullable=True),
        sa.Column("fat_g", sa.Float, nullable=True),
        sa.Column("ready_in_minutes", sa.Integer, nullable=True),
        sa.Column("servings", sa.Integer, nullable=True),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("saved_at", sa.DateTime, nullable=False),
    )

    # ── meal_plans ─────────────────────────────────────────────
    op.create_table(
        "meal_plans",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("recipe_id", sa.Integer, sa.ForeignKey("saved_recipes.id"), nullable=False),
        sa.Column("date", sa.String(10), nullable=False, index=True),
        sa.Column("meal_slot", sa.String(20), nullable=False),
    )

    # ── nutrition_logs ─────────────────────────────────────────
    op.create_table(
        "nutrition_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("food_item", sa.String(255), nullable=False),
        sa.Column("calories", sa.Float, nullable=False, server_default="0"),
        sa.Column("protein_g", sa.Float, nullable=False, server_default="0"),
        sa.Column("carbs_g", sa.Float, nullable=False, server_default="0"),
        sa.Column("fat_g", sa.Float, nullable=False, server_default="0"),
        sa.Column("fiber_g", sa.Float, nullable=True, server_default="0"),
        sa.Column("quantity", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("unit", sa.String(50), nullable=False, server_default="serving"),
        sa.Column("meal_slot", sa.String(20), nullable=False, server_default="Snack"),
        sa.Column("date", sa.String(10), nullable=False, index=True),
        sa.Column("logged_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("nutrition_logs")
    op.drop_table("meal_plans")
    op.drop_table("saved_recipes")
    op.drop_table("users")
