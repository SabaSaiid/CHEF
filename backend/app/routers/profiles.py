"""
User Profiles router -- full CRUD for named nutrition profiles.
Each user account can have multiple named profiles.
Only one profile is active at a time.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserProfile
from app.schemas import UserProfileCreate, UserProfileUpdate, UserProfileResponse, TDEERequest
from app.auth import get_current_user
from app.routers.tdee import calculate_tdee_macros
from app.routers.health_engine import apply_health_adjustments

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("/", response_model=list[UserProfileResponse], status_code=status.HTTP_200_OK, summary="List all profiles")
def list_profiles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(UserProfile).filter(UserProfile.user_id == current_user.id).all()


@router.get("/active", response_model=UserProfileResponse, status_code=status.HTTP_200_OK, summary="Get active profile")
def get_active_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id, UserProfile.is_active == True).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active profile found.")
    return profile


@router.post("/", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED, summary="Create a new profile")
def create_profile(body: UserProfileCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing_count = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).count()
    make_active = existing_count == 0
    profile = UserProfile(
        user_id=current_user.id,
        profile_name=body.profile_name,
        display_name=body.display_name,
        diet_type=body.diet_type,
        allergens=body.allergens,
        health_conditions=body.health_conditions,
        taste_preferences=body.taste_preferences,
        age=body.age,
        gender=body.gender,
        weight_kg=body.weight_kg,
        height_cm=body.height_cm,
        activity_level=body.activity_level,
        goal=body.goal,
        goal_intensity=body.goal_intensity,
        body_fat_percent=body.body_fat_percent,
        is_active=make_active,
    )
    if all([body.age, body.gender, body.weight_kg, body.height_cm, body.activity_level, body.goal]):
        _calculate_and_save_targets(profile, body)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/{profile_id}", response_model=UserProfileResponse, status_code=status.HTTP_200_OK, summary="Update a profile")
def update_profile(profile_id: int, body: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _get_owned_profile(profile_id, current_user.id, db)
    profile.profile_name = body.profile_name
    profile.display_name = body.display_name
    profile.diet_type = body.diet_type
    profile.allergens = body.allergens
    profile.health_conditions = body.health_conditions
    profile.taste_preferences = body.taste_preferences
    profile.age = body.age
    profile.gender = body.gender
    profile.weight_kg = body.weight_kg
    profile.height_cm = body.height_cm
    profile.activity_level = body.activity_level
    profile.goal = body.goal
    profile.goal_intensity = body.goal_intensity
    profile.body_fat_percent = body.body_fat_percent
    if all([body.age, body.gender, body.weight_kg, body.height_cm, body.activity_level, body.goal]):
        _calculate_and_save_targets(profile, body)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/{profile_id}/activate", response_model=UserProfileResponse, status_code=status.HTTP_200_OK, summary="Activate a profile")
def activate_profile(profile_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = _get_owned_profile(profile_id, current_user.id, db)
    db.query(UserProfile).filter(UserProfile.user_id == current_user.id).update({"is_active": False})
    target.is_active = True
    db.commit()
    db.refresh(target)
    return target


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a profile")
def delete_profile(profile_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _get_owned_profile(profile_id, current_user.id, db)
    db.delete(profile)
    db.commit()


def _get_owned_profile(profile_id: int, user_id: int, db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile


def _calculate_and_save_targets(profile: UserProfile, data) -> None:
    try:
        req = TDEERequest(
            age=data.age,
            gender=data.gender,
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            activity_level=data.activity_level,
            goal=data.goal,
            goal_intensity=data.goal_intensity or "moderate",
            body_fat_percent=data.body_fat_percent,
        )
        result = calculate_tdee_macros(req)
        profile.target_calories = result.target_calories
        profile.target_protein = result.target_protein
        profile.target_carbs = result.target_carbs
        profile.target_fat = result.target_fat
        profile.bmr = result.bmr
        profile.tdee_maintenance = result.tdee_maintenance
        profile.bmi = result.bmi
        profile.target_fiber_g = result.target_fiber_g
        profile.target_water_ml = result.target_water_ml

        # Apply health condition adjustments if any
        health_conditions = getattr(data, 'health_conditions', None) or getattr(profile, 'health_conditions', None)
        if health_conditions:
            adj = apply_health_adjustments(
                base_calories=result.target_calories,
                base_protein=result.target_protein,
                base_carbs=result.target_carbs,
                base_fat=result.target_fat,
                base_fiber=result.target_fiber_g,
                base_water=result.target_water_ml,
                weight_kg=data.weight_kg,
                health_conditions_str=health_conditions,
            )
            if adj.target_calories is not None:
                profile.target_calories = adj.target_calories
            if adj.target_protein is not None:
                profile.target_protein = adj.target_protein
            if adj.target_carbs is not None:
                profile.target_carbs = adj.target_carbs
            if adj.target_fat is not None:
                profile.target_fat = adj.target_fat
            if adj.target_fiber_g is not None:
                profile.target_fiber_g = adj.target_fiber_g
            if adj.target_water_ml is not None:
                profile.target_water_ml = adj.target_water_ml
            # Note: protein_pct/carbs_pct/fat_pct are not stored on UserProfile;
            # percentage breakdowns are computed on the fly by the frontend.
    except Exception as e:
        import logging
        logging.getLogger("chef.profiles").warning("Failed to calculate targets for profile %s: %s", profile.id, e)
