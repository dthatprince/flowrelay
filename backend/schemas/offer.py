from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models import OfferStatus

class OfferCreate(BaseModel):
    company_representative: str
    emergency_phone: str
    description: str
    pickup_date: str
    pickup_time: str
    pickup_address: str
    dropoff_address: str
    additional_service: Optional[str] = None

class OfferUpdate(BaseModel):
    company_representative: Optional[str] = None
    emergency_phone: Optional[str] = None
    description: Optional[str] = None
    pickup_date: Optional[str] = None
    pickup_time: Optional[str] = None
    pickup_address: Optional[str] = None
    dropoff_address: Optional[str] = None
    additional_service: Optional[str] = None

class DriverAssignment(BaseModel):
    driver_first_name: str
    driver_phone: str
    vehicle_make: str
    vehicle_model: str
    vehicle_color: str
    vehicle_plate: str
    status: OfferStatus

class OfferResponse(BaseModel):
    id: int
    client_id: int
    company_representative: str
    emergency_phone: str
    description: str
    pickup_date: str
    pickup_time: str
    pickup_address: str
    dropoff_address: str
    additional_service: Optional[str]
    status: OfferStatus
    driver_first_name: Optional[str]
    driver_phone: Optional[str]
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    vehicle_color: Optional[str]
    vehicle_plate: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True