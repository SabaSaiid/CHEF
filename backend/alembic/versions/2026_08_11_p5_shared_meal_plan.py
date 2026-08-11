"""Add shared_meal_plan to community_posts

Revision ID: p5_shared_meal_plan
Revises: p4_groups_challenges
Create Date: 2026-08-11 00:00:00.000000+00:00
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'p5_shared_meal_plan'
down_revision: Union[str, None] = 'p4_groups_challenges'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing shared_meal_plan column to community_posts
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('community_posts')]
    if 'shared_meal_plan' not in columns:
        op.add_column('community_posts', sa.Column('shared_meal_plan', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('community_posts', 'shared_meal_plan')
