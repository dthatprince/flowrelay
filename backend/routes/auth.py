from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import secrets

from database import get_db
from models import User
from schemas import UserSignup, Token, UserResponse
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from utils import send_verification_email
from config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="", tags=["Authentication"])

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
# ... other imports ...

@router.post("/signup", response_model=dict)
def signup(user: UserSignup, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create verification token
    verification_token = secrets.token_urlsafe(32)
    
    # Create user
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
    
    # Send verification email (async background task)
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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.is_verified != "true":
        raise HTTPException(status_code=400, detail="Please verify your email first")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user