"""Add recipe_reviews table for Phase 1

Revision ID: p1_recipe_reviews
Revises: e4db6d4c00db
Create Date: 2026-08-07 00:01:00.000000+00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'p1_recipe_reviews'
down_revision: Union[str, None] = 'e4db6d4c00db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'recipe_reviews',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('recipe_id', sa.String(length=255), nullable=False),
        sa.Column('recipe_source', sa.String(length=50), nullable=False, server_default='catalog'),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('review_text', sa.Text(), nullable=True),
        sa.Column('tip_category', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'recipe_id', 'recipe_source', name='uq_user_recipe_review')
    )
    op.create_index(op.f('ix_recipe_reviews_user_id'), 'recipe_reviews', ['user_id'], unique=False)
    op.create_index(op.f('ix_recipe_reviews_recipe_id'), 'recipe_reviews', ['recipe_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recipe_reviews_recipe_id'), table_name='recipe_reviews')
    op.drop_index(op.f('ix_recipe_reviews_user_id'), table_name='recipe_reviews')
    op.drop_table('recipe_reviews')
