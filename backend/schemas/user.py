from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from models import UserRole, AccountStatus

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
    account_status: AccountStatus  # NEW
    approval_notes: Optional[str]  # NEW
    approved_at: Optional[datetime]  # NEW
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    company_representative: Optional[str] = None
    emergency_phone: Optional[str] = None

class AccountApproval(BaseModel):
    """Schema for approving/rejecting user accounts"""
    status: AccountStatus  # approved, rejected, suspended
    notes: Optional[str] = None  # Admin notes