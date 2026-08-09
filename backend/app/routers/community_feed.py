"""
Community Social Feed Router — Phase 2 Community Module.
Handles posts, comments, likes, user follows, and global/following feed streams.
"""

from typing import Optional
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import CommunityPost, CommunityComment, CommunityLike, CommunityFollow, User
from app.auth import get_current_user, get_optional_user
from app.schemas import (
    PostCreateRequest, CommentCreateRequest, PostResponse, CommentResponse, UserCommunityProfile
)
from app.services.moderation import validate_clean_text

router = APIRouter(prefix="/api/community", tags=["community_feed"])
limiter = Limiter(key_func=get_remote_address)


def _format_post_response(post: CommunityPost, author_username: str, current_user_id: Optional[int]) -> PostResponse:
    """Helper to format CommunityPost into PostResponse with is_liked and is_author flags."""
    is_liked = False
    if current_user_id and post.id:
        db = Session.object_session(post)
        if db:
            like_exists = db.query(CommunityLike).filter(
                CommunityLike.post_id == post.id,
                CommunityLike.user_id == current_user_id,
            ).first()
            is_liked = like_exists is not None

    # Parse shared_meal_plan JSON if present
    meal_plan_data = None
    if post.shared_meal_plan:
        try:
            meal_plan_data = json.loads(post.shared_meal_plan)
        except (json.JSONDecodeError, TypeError):
            meal_plan_data = None

    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        username=author_username,
        content=post.content,
        image_url=post.image_url,
        recipe_id=post.recipe_id,
        recipe_source=post.recipe_source,
        group_id=post.group_id,
        shared_meal_plan=meal_plan_data,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        is_liked=is_liked,
        is_author=(current_user_id == post.user_id) if current_user_id else False,
        created_at=post.created_at,
    )


@router.get(
    "/feed/global",
    response_model=list[PostResponse],
    summary="Get global public feed of posts",
)
def get_global_feed(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Public read endpoint — returns paginated stream of all public community posts."""
    posts_with_users = (
        db.query(CommunityPost, User.username)
        .join(User, CommunityPost.user_id == User.id)
        .filter(CommunityPost.group_id.is_(None))  # Main feed excludes group-specific posts
        .order_by(CommunityPost.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    current_user_id = current_user.id if current_user else None
    return [_format_post_response(post, uname, current_user_id) for post, uname in posts_with_users]


@router.get(
    "/feed/following",
    response_model=list[PostResponse],
    summary="Get feed of posts from followed users",
)
def get_following_feed(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Auth required — returns stream of posts created by users followed by current_user."""
    following_ids = [
        f.following_id for f in db.query(CommunityFollow.following_id).filter(CommunityFollow.follower_id == current_user.id).all()
    ]

    if not following_ids:
        return []

    posts_with_users = (
        db.query(CommunityPost, User.username)
        .join(User, CommunityPost.user_id == User.id)
        .filter(
            CommunityPost.user_id.in_(following_ids),
            CommunityPost.group_id.is_(None),
        )
        .order_by(CommunityPost.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [_format_post_response(post, uname, current_user.id) for post, uname in posts_with_users]


@router.post(
    "/posts",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new social post (Rate limited: 5/min)",
)
@limiter.limit("5/minute")
def create_post(
    req: PostCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new social post with text moderation check."""
    validate_clean_text(req.content, field_name="Post content")

    post = CommunityPost(
        user_id=current_user.id,
        content=req.content,
        image_url=req.image_url,
        recipe_id=req.recipe_id,
        recipe_source=req.recipe_source,
        group_id=req.group_id,
        shared_meal_plan=json.dumps(req.shared_meal_plan) if req.shared_meal_plan else None,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return _format_post_response(post, current_user.username, current_user.id)


@router.delete(
    "/posts/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user's own post",
)
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a post created by current_user."""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this post")

    db.delete(post)
    db.commit()
    return None


@router.post(
    "/posts/{post_id}/like",
    summary="Toggle like on a post",
)
def toggle_like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle like state on a post."""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing = db.query(CommunityLike).filter(
        CommunityLike.post_id == post_id,
        CommunityLike.user_id == current_user.id,
    ).first()

    if existing:
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        is_liked = False
    else:
        like = CommunityLike(post_id=post_id, user_id=current_user.id)
        db.add(like)
        post.likes_count += 1
        is_liked = True

    db.commit()
    db.refresh(post)
    return {"post_id": post_id, "likes_count": post.likes_count, "is_liked": is_liked}


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add comment to a post (Rate limited: 15/min)",
)
@limiter.limit("15/minute")
def add_comment(
    post_id: int,
    req: CommentCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Comment on a post with text moderation check."""
    validate_clean_text(req.content, field_name="Comment content")

    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    comment = CommunityComment(
        post_id=post_id,
        user_id=current_user.id,
        content=req.content,
    )
    db.add(comment)
    post.comments_count += 1
    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        username=current_user.username,
        content=comment.content,
        created_at=comment.created_at,
    )


@router.get(
    "/posts/{post_id}/comments",
    response_model=list[CommentResponse],
    summary="Get comments for a post",
)
def get_comments(
    post_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Fetch list of comments on a post."""
    comments_with_users = (
        db.query(CommunityComment, User.username)
        .join(User, CommunityComment.user_id == User.id)
        .filter(CommunityComment.post_id == post_id)
        .order_by(CommunityComment.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        CommentResponse(
            id=c.id,
            post_id=c.post_id,
            user_id=c.user_id,
            username=uname,
            content=c.content,
            created_at=c.created_at,
        )
        for c, uname in comments_with_users
    ]


@router.post(
    "/users/{user_id}/follow",
    summary="Toggle follow on a user",
)
def toggle_follow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Follow or unfollow another user."""
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(CommunityFollow).filter(
        CommunityFollow.follower_id == current_user.id,
        CommunityFollow.following_id == user_id,
    ).first()

    if existing:
        db.delete(existing)
        is_following = False
    else:
        follow = CommunityFollow(follower_id=current_user.id, following_id=user_id)
        db.add(follow)
        is_following = True

    db.commit()
    return {"user_id": user_id, "is_following": is_following}


@router.get(
    "/users/{username}/profile",
    response_model=UserCommunityProfile,
    summary="Get public community profile for a chef/user",
)
def get_user_community_profile(
    username: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Public read — fetch user stats, followers count, following count, and recent posts."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chef profile not found")

    posts_count = db.query(func.count(CommunityPost.id)).filter(CommunityPost.user_id == user.id).scalar() or 0
    followers_count = db.query(func.count(CommunityFollow.id)).filter(CommunityFollow.following_id == user.id).scalar() or 0
    following_count = db.query(func.count(CommunityFollow.id)).filter(CommunityFollow.follower_id == user.id).scalar() or 0

    is_following = False
    current_user_id = current_user.id if current_user else None
    if current_user_id:
        is_following = db.query(CommunityFollow).filter(
            CommunityFollow.follower_id == current_user_id,
            CommunityFollow.following_id == user.id,
        ).first() is not None

    recent_posts_db = (
        db.query(CommunityPost)
        .filter(CommunityPost.user_id == user.id, CommunityPost.group_id.is_(None))
        .order_by(CommunityPost.created_at.desc())
        .limit(10)
        .all()
    )

    recent_posts = [_format_post_response(p, user.username, current_user_id) for p in recent_posts_db]

    return UserCommunityProfile(
        user_id=user.id,
        username=user.username,
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        is_following=is_following,
        recent_posts=recent_posts,
    )
