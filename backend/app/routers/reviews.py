"""
Recipe Reviews Router — Phase 1 Community Module.
Allows users to submit text reviews, cooking tips, and 1-5 star ratings on any recipe.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import RecipeReview, User
from app.auth import get_current_user
from app.schemas import RecipeReviewCreate, RecipeReviewResponse, RecipeReviewSummary
from app.services.moderation import validate_clean_text

router = APIRouter(prefix="/api/reviews", tags=["reviews"])
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "",
    response_model=RecipeReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a recipe review / cooking tip (Rate limited: 10/min)",
    responses={
        400: {"description": "Validation or moderation check failed"},
        401: {"description": "Authentication required"},
    },
)
@limiter.limit("10/minute")
def create_or_update_review(
    req: RecipeReviewCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit or update a review/cooking tip for a recipe."""
    # Text moderation check
    if req.review_text:
        validate_clean_text(req.review_text, field_name="Review text")

    # Check for existing review by this user for this recipe & source
    review = db.query(RecipeReview).filter(
        RecipeReview.user_id == current_user.id,
        RecipeReview.recipe_id == req.recipe_id,
        RecipeReview.recipe_source == req.recipe_source,
    ).first()

    if review:
        review.rating = req.rating
        review.review_text = req.review_text
        review.tip_category = req.tip_category
    else:
        review = RecipeReview(
            user_id=current_user.id,
            recipe_id=req.recipe_id,
            recipe_source=req.recipe_source,
            rating=req.rating,
            review_text=req.review_text,
            tip_category=req.tip_category,
        )
        db.add(review)

    db.commit()
    db.refresh(review)

    return RecipeReviewResponse(
        id=review.id,
        user_id=review.user_id,
        username=current_user.username,
        recipe_id=review.recipe_id,
        recipe_source=review.recipe_source,
        rating=review.rating,
        review_text=review.review_text,
        tip_category=review.tip_category,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.get(
    "/recipe/{recipe_id}",
    response_model=list[RecipeReviewResponse],
    summary="Get reviews and tips for a specific recipe",
)
def get_recipe_reviews(
    recipe_id: str,
    recipe_source: str = Query("catalog", description="catalog, spoonacular, or community"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve paginated reviews and cooking tips for a recipe."""
    reviews_with_users = (
        db.query(RecipeReview, User.username)
        .join(User, RecipeReview.user_id == User.id)
        .filter(
            RecipeReview.recipe_id == recipe_id,
            RecipeReview.recipe_source == recipe_source,
        )
        .order_by(RecipeReview.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        RecipeReviewResponse(
            id=rev.id,
            user_id=rev.user_id,
            username=uname,
            recipe_id=rev.recipe_id,
            recipe_source=rev.recipe_source,
            rating=rev.rating,
            review_text=rev.review_text,
            tip_category=rev.tip_category,
            created_at=rev.created_at,
            updated_at=rev.updated_at,
        )
        for rev, uname in reviews_with_users
    ]


@router.get(
    "/summary/{recipe_id}",
    response_model=RecipeReviewSummary,
    summary="Get aggregate review rating and count for a recipe",
)
def get_recipe_review_summary(
    recipe_id: str,
    recipe_source: str = Query("catalog", description="catalog, spoonacular, or community"),
    db: Session = Depends(get_db),
):
    """Fetch aggregate rating statistics (average rating, count, rating breakdown) for a recipe."""
    reviews = (
        db.query(RecipeReview.rating)
        .filter(
            RecipeReview.recipe_id == recipe_id,
            RecipeReview.recipe_source == recipe_source,
        )
        .all()
    )

    if not reviews:
        return RecipeReviewSummary(
            recipe_id=recipe_id,
            recipe_source=recipe_source,
            average_rating=0.0,
            total_reviews=0,
            rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
        )

    ratings = [r[0] for r in reviews]
    total_count = len(ratings)
    avg_rating = round(sum(ratings) / total_count, 1)

    dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in ratings:
        if 1 <= r <= 5:
            dist[r] += 1

    return RecipeReviewSummary(
        recipe_id=recipe_id,
        recipe_source=recipe_source,
        average_rating=avg_rating,
        total_reviews=total_count,
        rating_distribution=dist,
    )


@router.delete(
    "/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user's own review",
)
def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a review submitted by the authenticated user."""
    review = db.query(RecipeReview).filter(RecipeReview.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this review",
        )

    db.delete(review)
    db.commit()
    return None
