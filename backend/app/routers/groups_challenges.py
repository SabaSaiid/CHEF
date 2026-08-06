"""
Community Groups & Challenges Router — Phase 4 Community Module.
Handles joinable interest groups, group discussion threads, and time-boxed habit/nutrition challenges
integrated with user nutrition logs & TDEE metrics.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import (
    CommunityGroup, CommunityGroupMember, CommunityChallenge,
    CommunityChallengeParticipant, CommunityPost, User, NutritionLog, WaterLog
)
from app.auth import get_current_user, get_optional_user
from app.schemas import (
    CommunityGroupCreate, CommunityGroupResponse, CommunityChallengeResponse, PostResponse
)
from app.services.moderation import validate_clean_text

router = APIRouter(prefix="/api/community", tags=["groups_challenges"])
limiter = Limiter(key_func=get_remote_address)


# Helper function to auto-seed default challenges if table is empty
def _ensure_default_challenges(db: Session):
    count = db.query(func.count(CommunityChallenge.id)).scalar() or 0
    if count == 0:
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        defaults = [
            CommunityChallenge(
                title="7-Day High-Protein Challenge",
                description="Hit your daily protein target for 5 out of 7 days this week!",
                metric_type="protein_target_days",
                target_value=5.0,
                duration_days=7,
                start_date=today_str,
                end_date="2026-12-31",
                badge_icon="🥩",
            ),
            CommunityChallenge(
                title="Nutri-Score A/B Streak",
                description="Log at least 5 meals rated A or B on Nutri-Score.",
                metric_type="nutri_score_count",
                target_value=5.0,
                duration_days=7,
                start_date=today_str,
                end_date="2026-12-31",
                badge_icon="🥗",
            ),
            CommunityChallenge(
                title="Hydration Hero",
                description="Reach your target daily water intake for 3 consecutive days.",
                metric_type="water_target_days",
                target_value=3.0,
                duration_days=7,
                start_date=today_str,
                end_date="2026-12-31",
                badge_icon="💧",
            ),
        ]
        db.add_all(defaults)
        db.commit()


# Helper function to auto-seed default groups if table is empty
def _ensure_default_groups(db: Session):
    count = db.query(func.count(CommunityGroup.id)).scalar() or 0
    if count == 0:
        defaults = [
            CommunityGroup(
                name="High-Protein Beginners",
                slug="high-protein-beginners",
                description="Community for sharing meal ideas, recipes, and tips for muscle building and high-protein eating.",
                category="Goal",
            ),
            CommunityGroup(
                name="Diabetic-Friendly Cooking",
                slug="diabetic-friendly-cooking",
                description="Low-glycemic, blood-sugar conscious recipes and supportive meal planning tips.",
                category="Diet",
            ),
            CommunityGroup(
                name="Mediterranean Lifestyle",
                slug="mediterranean-lifestyle",
                description="Celebrating heart-healthy olive oil, fresh veggies, lean fish, and vibrant Mediterranean dishes.",
                category="Cuisine",
            ),
        ]
        db.add_all(defaults)
        db.commit()


# ── Groups Endpoints ───────────────────────────────────────────

@router.get(
    "/groups",
    response_model=list[CommunityGroupResponse],
    summary="Get list of community culinary groups",
)
def get_groups(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Public read — fetch all community groups with membership indicator."""
    _ensure_default_groups(db)
    groups = db.query(CommunityGroup).order_by(CommunityGroup.members_count.desc()).all()

    user_joined_group_ids = set()
    if current_user:
        memberships = db.query(CommunityGroupMember.group_id).filter(CommunityGroupMember.user_id == current_user.id).all()
        user_joined_group_ids = {m[0] for m in memberships}

    return [
        CommunityGroupResponse(
            id=g.id,
            name=g.name,
            slug=g.slug,
            description=g.description,
            category=g.category,
            creator_id=g.creator_id,
            members_count=g.members_count,
            is_member=(g.id in user_joined_group_ids),
            created_at=g.created_at,
        )
        for g in groups
    ]


@router.post(
    "/groups",
    response_model=CommunityGroupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new culinary group (Rate limited: 2/min)",
)
@limiter.limit("2/minute")
def create_group(
    req: CommunityGroupCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new community group."""
    validate_clean_text(req.name, field_name="Group name")
    validate_clean_text(req.description, field_name="Group description")

    slug = req.name.lower().replace(" ", "-")
    existing = db.query(CommunityGroup).filter(
        (CommunityGroup.name == req.name) | (CommunityGroup.slug == slug)
    ).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Group with this name already exists")

    group = CommunityGroup(
        name=req.name,
        slug=slug,
        description=req.description,
        category=req.category,
        creator_id=current_user.id,
        members_count=1,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    # Auto-join creator as member
    member = CommunityGroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    db.commit()

    return CommunityGroupResponse(
        id=group.id,
        name=group.name,
        slug=group.slug,
        description=group.description,
        category=group.category,
        creator_id=group.creator_id,
        members_count=1,
        is_member=True,
        created_at=group.created_at,
    )


@router.post(
    "/groups/{group_id}/join",
    summary="Toggle join/leave group",
)
def toggle_join_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join or leave a culinary group."""
    group = db.query(CommunityGroup).filter(CommunityGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    existing = db.query(CommunityGroupMember).filter(
        CommunityGroupMember.group_id == group_id,
        CommunityGroupMember.user_id == current_user.id,
    ).first()

    if existing:
        db.delete(existing)
        group.members_count = max(0, group.members_count - 1)
        is_member = False
    else:
        member = CommunityGroupMember(group_id=group_id, user_id=current_user.id)
        db.add(member)
        group.members_count += 1
        is_member = True

    db.commit()
    return {"group_id": group_id, "members_count": group.members_count, "is_member": is_member}


@router.get(
    "/groups/{group_id}/feed",
    response_model=list[PostResponse],
    summary="Get discussion thread posts for a group",
)
def get_group_feed(
    group_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Public read — fetch posts posted inside a specific group thread."""
    from app.routers.community_feed import _format_post_response

    posts_with_users = (
        db.query(CommunityPost, User.username)
        .join(User, CommunityPost.user_id == User.id)
        .filter(CommunityPost.group_id == group_id)
        .order_by(CommunityPost.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    current_user_id = current_user.id if current_user else None
    return [_format_post_response(p, uname, current_user_id) for p, uname in posts_with_users]


# ── Challenges Endpoints ───────────────────────────────────────

@router.get(
    "/challenges",
    response_model=list[CommunityChallengeResponse],
    summary="Get list of active challenges",
)
def get_challenges(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Public read — fetch active challenges and current user enrollment & progress."""
    _ensure_default_challenges(db)
    challenges = db.query(CommunityChallenge).order_by(CommunityChallenge.created_at.desc()).all()

    user_participants = {}
    if current_user:
        parts = db.query(CommunityChallengeParticipant).filter(CommunityChallengeParticipant.user_id == current_user.id).all()
        user_participants = {p.challenge_id: p for p in parts}

    res = []
    for ch in challenges:
        part = user_participants.get(ch.id)
        res.append(
            CommunityChallengeResponse(
                id=ch.id,
                title=ch.title,
                description=ch.description,
                metric_type=ch.metric_type,
                target_value=ch.target_value,
                duration_days=ch.duration_days,
                start_date=ch.start_date,
                end_date=ch.end_date,
                badge_icon=ch.badge_icon,
                is_joined=(part is not None),
                current_progress=part.current_progress if part else 0.0,
                is_completed=part.is_completed if part else False,
            )
        )
    return res


@router.post(
    "/challenges/{challenge_id}/join",
    summary="Enroll in a challenge",
)
def join_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enroll authenticated user in a nutrition/habit challenge."""
    ch = db.query(CommunityChallenge).filter(CommunityChallenge.id == challenge_id).first()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    existing = db.query(CommunityChallengeParticipant).filter(
        CommunityChallengeParticipant.challenge_id == challenge_id,
        CommunityChallengeParticipant.user_id == current_user.id,
    ).first()

    if not existing:
        part = CommunityChallengeParticipant(
            challenge_id=challenge_id,
            user_id=current_user.id,
            current_progress=0.0,
            is_completed=False,
        )
        db.add(part)
        db.commit()

    return {"challenge_id": challenge_id, "is_joined": True}


@router.get(
    "/challenges/{challenge_id}/progress",
    summary="Compute real-time challenge progress from user nutrition logs",
)
def get_challenge_progress(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Auth required — dynamically evaluates progress against actual user nutrition_logs / water_logs."""
    ch = db.query(CommunityChallenge).filter(CommunityChallenge.id == challenge_id).first()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    part = db.query(CommunityChallengeParticipant).filter(
        CommunityChallengeParticipant.challenge_id == challenge_id,
        CommunityChallengeParticipant.user_id == current_user.id,
    ).first()

    if not part:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not enrolled in this challenge")

    # Evaluate metric based on user's nutrition logs
    progress = 0.0
    if ch.metric_type == "protein_target_days":
        target_prot = current_user.target_protein or 100.0
        daily_proteins = (
            db.query(NutritionLog.date, func.sum(NutritionLog.protein_g))
            .filter(NutritionLog.user_id == current_user.id)
            .group_by(NutritionLog.date)
            .all()
        )
        progress = float(sum(1 for _, total_prot in daily_proteins if total_prot >= target_prot))

    elif ch.metric_type == "water_target_days":
        target_w = current_user.target_water_ml or 2000
        daily_water = (
            db.query(WaterLog.date, func.sum(WaterLog.amount_ml))
            .filter(WaterLog.user_id == current_user.id)
            .group_by(WaterLog.date)
            .all()
        )
        progress = float(sum(1 for _, total_w in daily_water if total_w >= target_w))

    elif ch.metric_type in ("nutri_score_count", "recipes_logged"):
        progress = float(
            db.query(func.count(NutritionLog.id)).filter(NutritionLog.user_id == current_user.id).scalar() or 0
        )

    is_completed = progress >= ch.target_value
    part.current_progress = progress
    part.is_completed = is_completed
    if is_completed and not part.completed_at:
        part.completed_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "challenge_id": challenge_id,
        "title": ch.title,
        "metric_type": ch.metric_type,
        "target_value": ch.target_value,
        "current_progress": progress,
        "is_completed": is_completed,
    }
