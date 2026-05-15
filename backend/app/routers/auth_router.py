"""
Authentication router — signup, login, and current user profile.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserSignupRequest, UserLoginRequest, TokenResponse, UserResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account",
    responses={
        409: {"description": "Username or email is already registered"},
    },
)
def signup(req: UserSignupRequest, db: Session = Depends(get_db)):
    """
    Create a new user account.
    Returns a JWT token immediately so the user is logged in after signup.
    """
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken. Please choose another.",
        )

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered. Please use a different email.",
        )

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=token,
        username=user.username,
        user_id=user.id,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in with username and password",
    responses={
        401: {"description": "Invalid username or password"},
    },
)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user with username + password.
    Returns a JWT token on success.
    """
    user = db.query(User).filter(User.username == req.username).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=token,
        username=user.username,
        user_id=user.id,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    responses={
        401: {"description": "Missing or invalid JWT token"},
    },
)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
