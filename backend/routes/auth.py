from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
import secrets

from database import get_db
from models import User
from schemas import UserSignup, Token, UserResponse
from auth import get_password_hash, verify_password, create_access_token, create_refresh_token, get_current_user
from utils import send_verification_email, send_password_reset_email, send_password_changed_email
from config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from jose import JWTError, jwt
from config import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="", tags=["Authentication"])


@router.post("/signup", response_model=dict)
def signup(user: UserSignup, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = secrets.token_urlsafe(32)

    new_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        role=user.role,
        company_name=user.company_name,
        address=user.address,
        phone_number=user.phone_number,
        company_representative=user.company_representative,
        emergency_phone=user.emergency_phone,
        verification_token=verification_token
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    background_tasks.add_task(send_verification_email, user.email, verification_token)

    return {"message": "User created. Please check your email to verify your account."}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    user.is_verified = "true"
    user.verification_token = None
    db.commit()

    return {"message": "Email verified successfully. You can now login."}


@router.post("/login", response_model=Token)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.is_verified != "true":
        raise HTTPException(status_code=400, detail="Please verify your email first")

    #  Issue short-lived access token — returned in JSON, stored in JS memory
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    #  Issue long-lived refresh token — stored in HttpOnly cookie, JS never sees it
    refresh_token = create_refresh_token(
        data={"sub": user.email},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,       # JS cannot read this
        secure=True,         # HTTPS only
        samesite="none",   # No cross-site sending
        max_age=60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS,
        path="/"
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/refresh", response_model=Token)
def refresh_access_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db)
):
    """
     Called on every page load by the frontend to restore the session.
    Reads the HttpOnly refresh cookie — JS never touches it directly.
    Returns a fresh short-lived access token in the JSON body.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token"
        )

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")

        if email is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Issue a new short-lived access token
    new_access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    #  Rotate the refresh token on each use (more secure)
    new_refresh_token = create_refresh_token(
        data={"sub": user.email},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS,
        path="/"
    )

    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/auth/logout")
def logout(response: Response):
    """
     Clears the HttpOnly refresh cookie on logout.
    Frontend also clears the in-memory access token.
    """
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


# ─── Forgot Password ──────────────────────────────────────────────────────────

@router.post("/forgot-password", response_model=dict)
def forgot_password(
    body: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Accepts { "email": "..." }.
    Always returns the same success message whether the email exists or not
    — this prevents user enumeration attacks.
    """
    from datetime import datetime, timedelta
    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="Email is required")

    user = db.query(User).filter(User.email == email).first()

    #  Always respond the same way — don't reveal whether the email exists
    if user and user.is_verified == "true":
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        background_tasks.add_task(send_password_reset_email, user.email, reset_token)

    return {"message": "If an account with that email exists, a password reset link has been sent."}


# ─── Reset Password (via email link) ─────────────────────────────────────────

@router.post("/reset-password", response_model=dict)
def reset_password(body: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Accepts { "token": "...", "new_password": "..." }.
    Used from the reset-password.html page linked in the email.
    """
    from datetime import datetime
    token = body.get("token", "").strip()
    new_password = body.get("new_password", "").strip()

    if not token or not new_password:
        raise HTTPException(status_code=422, detail="Token and new password are required")

    if len(new_password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")

    user = db.query(User).filter(User.password_reset_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if user.password_reset_expires < datetime.utcnow():
        # Clear expired token
        user.password_reset_token = None
        user.password_reset_expires = None
        db.commit()
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    # Update password and clear the token
    user.hashed_password = get_password_hash(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()

    background_tasks.add_task(send_password_changed_email, user.email)

    return {"message": "Password reset successfully. You can now log in with your new password."}


# ─── Change Password (logged-in users) ────────────────────────────────────────

@router.post("/change-password", response_model=dict)
def change_password(
    body: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts { "current_password": "...", "new_password": "..." }.
    Requires a valid access token — used from account settings pages.
    """
    current_password = body.get("current_password", "").strip()
    new_password = body.get("new_password", "").strip()

    if not current_password or not new_password:
        raise HTTPException(status_code=422, detail="Current and new passwords are required")

    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(new_password) < 6:
        raise HTTPException(status_code=422, detail="New password must be at least 6 characters")

    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different from your current password")

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()

    background_tasks.add_task(send_password_changed_email, current_user.email)

    return {"message": "Password changed successfully."}