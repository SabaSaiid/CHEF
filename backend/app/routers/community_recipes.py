"""
Community User-Submitted Recipes Router — Phase 3 Community Module.
Handles custom recipe submissions, Nutri-Score engine calculation, macro sanity checks,
moderation status pipeline, and admin moderation queue.
"""

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import CommunityRecipe, User
from app.auth import get_current_user
from app.schemas import CommunityRecipeCreate, CommunityRecipeResponse
from app.scoring.calculator import compute_nutri_score
from app.services.moderation import validate_clean_text

router = APIRouter(prefix="/api/community/recipes", tags=["community_recipes"])
limiter = Limiter(key_func=get_remote_address)

# ── Admin Authorization ────────────────────────────────────────
# Designate admin usernames who can moderate community recipe submissions.
# In production, this would come from a database role or environment variable.
ADMIN_USERNAMES = {"saba", "admin"}


def _is_admin(user: User) -> bool:
    """Check if a user has admin privileges for moderation."""
    return user.username.lower() in ADMIN_USERNAMES


class ModerationRequest(BaseModel):
    """Request body for moderating a community recipe."""
    action: str = Field(..., description="'approve' or 'reject'")
    moderation_note: Optional[str] = Field(None, max_length=1000, description="Optional note for the submitter")


def _format_community_recipe_response(recipe: CommunityRecipe, submitter_username: str) -> CommunityRecipeResponse:
    """Format CommunityRecipe ORM instance into response schema."""
    ing_list = []
    if recipe.ingredients:
        try:
            ing_list = json.loads(recipe.ingredients)
        except Exception:
            ing_list = [recipe.ingredients]

    diets_list = [d.strip() for d in recipe.diets.split(",") if d.strip()] if recipe.diets else []

    return CommunityRecipeResponse(
        id=recipe.id,
        submitter_id=recipe.submitter_id,
        submitter_username=submitter_username,
        title=recipe.title,
        summary=recipe.summary,
        image_url=recipe.image_url,
        ready_in_minutes=recipe.ready_in_minutes,
        servings=recipe.servings,
        ingredients=ing_list,
        instructions=recipe.instructions,
        diets=diets_list,
        meal_type=recipe.meal_type,
        region=recipe.region,
        calories=recipe.calories,
        protein_g=recipe.protein_g,
        carbs_g=recipe.carbs_g,
        fat_g=recipe.fat_g,
        fiber_g=recipe.fiber_g or 0.0,
        nutri_score_grade=recipe.nutri_score_grade,
        nutri_score_points=recipe.nutri_score_points,
        moderation_status=recipe.moderation_status,
        moderation_note=recipe.moderation_note,
        created_at=recipe.created_at,
    )


@router.post(
    "",
    response_model=CommunityRecipeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a custom community recipe (Rate limited: 3/min)",
)
@limiter.limit("3/minute")
def submit_community_recipe(
    req: CommunityRecipeCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a community recipe. Automatically calculates Nutri-Score & runs moderation sanity check."""
    # Text moderation checks
    validate_clean_text(req.title, field_name="Recipe title")
    if req.summary:
        validate_clean_text(req.summary, field_name="Recipe summary")
    validate_clean_text(req.instructions, field_name="Recipe instructions")
    for ing in req.ingredients:
        validate_clean_text(ing, field_name="Ingredient text")

    # Compute Nutri-Score using CHEF scoring engine
    calculated_ns = compute_nutri_score(
        nutrition={
            "calories": req.calories,
            "protein_g": req.protein_g,
            "carbs_g": req.carbs_g,
            "fat_g": req.fat_g,
            "fiber_g": req.fiber_g or 0.0,
            "sodium_mg": req.sodium_mg or 0.0,
            "sugar_g": req.sugar_g or 0.0,
        },
        ingredients=req.ingredients,
        servings=req.servings,
        title=req.title,
    )

    # Macro sanity check: compare reported calories with expected macro energy sum
    expected_cal = (req.protein_g * 4.0) + (req.carbs_g * 4.0) + (req.fat_g * 9.0)
    moderation_status = "approved"
    moderation_note = None

    if req.calories > 0 and expected_cal > 0:
        ratio = abs(req.calories - expected_cal) / max(req.calories, expected_cal)
        if ratio > 0.35:  # > 35% discrepancy flags for pending review
            moderation_status = "pending"
            moderation_note = "Macro density discrepancy detected — pending review."

    ingredients_json = json.dumps(req.ingredients)
    diets_str = ",".join(req.diets) if req.diets else None

    recipe = CommunityRecipe(
        submitter_id=current_user.id,
        title=req.title,
        summary=req.summary,
        image_url=req.image_url,
        ready_in_minutes=req.ready_in_minutes,
        servings=req.servings,
        ingredients=ingredients_json,
        instructions=req.instructions,
        diets=diets_str,
        meal_type=req.meal_type,
        region=req.region,
        calories=req.calories,
        protein_g=req.protein_g,
        carbs_g=req.carbs_g,
        fat_g=req.fat_g,
        fiber_g=req.fiber_g or 0.0,
        sodium_mg=req.sodium_mg or 0.0,
        sugar_g=req.sugar_g or 0.0,
        nutri_score_grade=calculated_ns.grade,
        nutri_score_points=calculated_ns.numeric_score,
        moderation_status=moderation_status,
        moderation_note=moderation_note,
    )

    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    return _format_community_recipe_response(recipe, current_user.username)


@router.get(
    "",
    response_model=list[CommunityRecipeResponse],
    summary="Search approved community-submitted recipes",
)
def get_approved_community_recipes(
    query: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Public read — returns approved user-submitted community recipes."""
    db_query = (
        db.query(CommunityRecipe, User.username)
        .join(User, CommunityRecipe.submitter_id == User.id)
        .filter(CommunityRecipe.moderation_status == "approved")
    )

    if query:
        db_query = db_query.filter(CommunityRecipe.title.ilike(f"%{query}%"))

    results = db_query.order_by(CommunityRecipe.created_at.desc()).offset(offset).limit(limit).all()

    return [_format_community_recipe_response(r, uname) for r, uname in results]


@router.get(
    "/my-submissions",
    response_model=list[CommunityRecipeResponse],
    summary="Get current user's submitted recipes",
)
def get_my_submissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Auth required — list all submissions by current user (including pending & rejected)."""
    recipes = (
        db.query(CommunityRecipe)
        .filter(CommunityRecipe.submitter_id == current_user.id)
        .order_by(CommunityRecipe.created_at.desc())
        .all()
    )
    return [_format_community_recipe_response(r, current_user.username) for r in recipes]


@router.get(
    "/admin/check",
    summary="Check if current user has admin moderation privileges",
)
def check_admin_status(
    current_user: User = Depends(get_current_user),
):
    """Auth required — returns whether the current user is an admin moderator."""
    return {"is_admin": _is_admin(current_user)}


@router.get(
    "/pending",
    response_model=list[CommunityRecipeResponse],
    summary="Get pending community recipes (admin only)",
)
def get_pending_recipes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin only — returns all community recipes with 'pending' moderation status."""
    if not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required to view pending recipes."
        )

    results = (
        db.query(CommunityRecipe, User.username)
        .join(User, CommunityRecipe.submitter_id == User.id)
        .filter(CommunityRecipe.moderation_status == "pending")
        .order_by(CommunityRecipe.created_at.asc())
        .all()
    )
    return [_format_community_recipe_response(r, uname) for r, uname in results]


@router.post(
    "/{recipe_id}/moderate",
    response_model=CommunityRecipeResponse,
    summary="Approve or reject a community recipe (admin only)",
)
def moderate_recipe(
    recipe_id: int,
    req: ModerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin only — approve or reject a pending community recipe submission."""
    if not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required to moderate recipes."
        )

    if req.action not in ("approve", "reject"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'approve' or 'reject'."
        )

    res = (
        db.query(CommunityRecipe, User.username)
        .join(User, CommunityRecipe.submitter_id == User.id)
        .filter(CommunityRecipe.id == recipe_id)
        .first()
    )
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community recipe not found."
        )

    recipe, submitter_username = res
    recipe.moderation_status = "approved" if req.action == "approve" else "rejected"
    if req.moderation_note:
        recipe.moderation_note = req.moderation_note
    elif req.action == "approve":
        recipe.moderation_note = f"Approved by @{current_user.username}"
    else:
        recipe.moderation_note = req.moderation_note or f"Rejected by @{current_user.username}"

    db.commit()
    db.refresh(recipe)

    return _format_community_recipe_response(recipe, submitter_username)


@router.get(
    "/{recipe_id}",
    response_model=CommunityRecipeResponse,
    summary="Get single community recipe by ID",
)
def get_community_recipe_by_id(
    recipe_id: int,
    db: Session = Depends(get_db),
):
    """Public read — fetch single approved community recipe."""
    res = (
        db.query(CommunityRecipe, User.username)
        .join(User, CommunityRecipe.submitter_id == User.id)
        .filter(CommunityRecipe.id == recipe_id)
        .first()
    )
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community recipe not found")

    recipe, uname = res
    if recipe.moderation_status != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipe is pending moderation approval")

    return _format_community_recipe_response(recipe, uname)
