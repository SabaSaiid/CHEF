"""
Authentication router — signup, login, and current user profile.
Rate-limited to prevent brute-force attacks (OWASP A07).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import User
from app.schemas import UserSignupRequest, UserLoginRequest, TokenResponse, UserResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account (rate limited: 3/min)",
    responses={
        409: {"description": "Username or email is already registered"},
        429: {"description": "Too many signup attempts"},
    },
)
@limiter.limit("3/minute")
def signup(req: UserSignupRequest, request: Request, db: Session = Depends(get_db)):
    """
    Create a new user account.
    Returns a JWT token immediately so the user is logged in after signup.
    """
    # Check for existing username or email — use a single generic message
    # to prevent user enumeration attacks (OWASP A07)
    existing_user = db.query(User).filter(
        (User.username == req.username) | (User.email == req.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this username or email already exists.",
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
    summary="Log in with username and password (rate limited: 5/min)",
    responses={
        401: {"description": "Invalid username or password"},
        429: {"description": "Too many login attempts"},
    },
)
@limiter.limit("5/minute")
def login(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
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
