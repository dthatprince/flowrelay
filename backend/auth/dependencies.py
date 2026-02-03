from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from config import SECRET_KEY, ALGORITHM
from database import get_db
from models import User, UserRole, AccountStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    
    # Check email verification
    if user.is_verified != "true":
        raise HTTPException(status_code=403, detail="Email not verified. Please verify your email first.")
    
    # Check account approval (NEW)
    if user.account_status == AccountStatus.PENDING:
        raise HTTPException(
            status_code=403, 
            detail="Account pending admin approval. Please wait for approval to access the system."
        )
    elif user.account_status == AccountStatus.REJECTED:
        raise HTTPException(
            status_code=403, 
            detail="Account has been rejected. Please contact support for more information."
        )
    elif user.account_status == AccountStatus.SUSPENDED:
        raise HTTPException(
            status_code=403, 
            detail="Account has been suspended. Please contact support for more information."
        )
    
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user