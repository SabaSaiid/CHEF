"""Add social feed tables for Phase 2

Revision ID: p2_social_feed
Revises: p1_recipe_reviews
Create Date: 2026-08-07 00:02:00.000000+00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p2_social_feed'
down_revision: Union[str, None] = 'p1_recipe_reviews'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'community_posts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('image_url', sa.String(length=1000), nullable=True),
        sa.Column('recipe_id', sa.String(length=255), nullable=True),
        sa.Column('recipe_source', sa.String(length=50), nullable=True, server_default='catalog'),
        sa.Column('group_id', sa.Integer(), nullable=True),
        sa.Column('likes_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('comments_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_community_posts_user_id'), 'community_posts', ['user_id'], unique=False)
    op.create_index(op.f('ix_community_posts_recipe_id'), 'community_posts', ['recipe_id'], unique=False)

    op.create_table(
        'community_comments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['community_posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_community_comments_post_id'), 'community_comments', ['post_id'], unique=False)
    op.create_index(op.f('ix_community_comments_user_id'), 'community_comments', ['user_id'], unique=False)

    op.create_table(
        'community_likes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['community_posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('post_id', 'user_id', name='uq_post_user_like')
    )

    op.create_table(
        'community_follows',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('follower_id', sa.Integer(), nullable=False),
        sa.Column('following_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['follower_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['following_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'following_id', name='uq_user_follow')
    )


def downgrade() -> None:
    op.drop_table('community_follows')
    op.drop_table('community_likes')
    op.drop_table('community_comments')
    op.drop_table('community_posts')
