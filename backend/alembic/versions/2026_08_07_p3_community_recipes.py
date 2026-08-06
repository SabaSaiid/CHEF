"""Add community_recipes table for Phase 3

Revision ID: p3_community_recipes
Revises: p2_social_feed
Create Date: 2026-08-07 00:03:00.000000+00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p3_community_recipes'
down_revision: Union[str, None] = 'p2_social_feed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'community_recipes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('submitter_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(length=1000), nullable=True),
        sa.Column('ready_in_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('servings', sa.Integer(), nullable=False, server_default='4'),
        sa.Column('ingredients', sa.Text(), nullable=False),
        sa.Column('instructions', sa.Text(), nullable=False),
        sa.Column('diets', sa.String(length=500), nullable=True),
        sa.Column('meal_type', sa.String(length=100), nullable=True),
        sa.Column('region', sa.String(length=100), nullable=True),
        sa.Column('calories', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('protein_g', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('carbs_g', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('fat_g', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('fiber_g', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('sodium_mg', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('sugar_g', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('nutri_score_grade', sa.String(length=2), nullable=True),
        sa.Column('nutri_score_points', sa.Integer(), nullable=True),
        sa.Column('moderation_status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('moderation_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['submitter_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_community_recipes_submitter_id'), 'community_recipes', ['submitter_id'], unique=False)
    op.create_index(op.f('ix_community_recipes_title'), 'community_recipes', ['title'], unique=False)
    op.create_index(op.f('ix_community_recipes_moderation_status'), 'community_recipes', ['moderation_status'], unique=False)


def downgrade() -> None:
    op.drop_table('community_recipes')
