"""Add groups and challenges tables for Phase 4

Revision ID: p4_groups_challenges
Revises: p3_community_recipes
Create Date: 2026-08-07 00:04:00.000000+00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p4_groups_challenges'
down_revision: Union[str, None] = 'p3_community_recipes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'community_groups',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('slug', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='Diet'),
        sa.Column('creator_id', sa.Integer(), nullable=True),
        sa.Column('members_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_community_groups_slug'), 'community_groups', ['slug'], unique=True)

    op.create_table(
        'community_group_members',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['community_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('group_id', 'user_id', name='uq_group_member')
    )

    op.create_table(
        'community_challenges',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('metric_type', sa.String(length=50), nullable=False),
        sa.Column('target_value', sa.Float(), nullable=False),
        sa.Column('duration_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('start_date', sa.String(length=10), nullable=False),
        sa.Column('end_date', sa.String(length=10), nullable=False),
        sa.Column('badge_icon', sa.String(length=100), nullable=False, server_default='🏆'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'community_challenge_participants',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('challenge_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('current_progress', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['challenge_id'], ['community_challenges.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('challenge_id', 'user_id', name='uq_challenge_participant')
    )


def downgrade() -> None:
    op.drop_table('community_challenge_participants')
    op.drop_table('community_challenges')
    op.drop_table('community_group_members')
    op.drop_table('community_groups')
