from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class DriverCreate(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    license_number: str
    license_expiry: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: str
    vehicle_color: str
    vehicle_plate: str
    insurance_number: str
    insurance_expiry: str

class DriverUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_plate: Optional[str] = None
    insurance_number: Optional[str] = None
    insurance_expiry: Optional[str] = None
    status: Optional[str] = None

class DriverResponse(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    phone_number: str
    license_number: str
    license_expiry: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: str
    vehicle_color: str
    vehicle_plate: str
    insurance_number: str
    insurance_expiry: str
    status: str
    rating: str
    total_deliveries: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class OfferAcceptance(BaseModel):
    accept: bool

class OfferStatusUpdate(BaseModel):
    status: str  # in_progress, completed, cancelled
    notes: Optional[str] = None