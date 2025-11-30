from pydantic import BaseModel, EmailStr
from typing import Optional
from models import UserRole

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    company_name: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    company_representative: Optional[str] = None
    emergency_phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    company_name: Optional[str]
    address: Optional[str]
    phone_number: Optional[str]
    company_representative: Optional[str]
    emergency_phone: Optional[str]
    is_verified: str
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    company_representative: Optional[str] = None
    emergency_phone: Optional[str] = None