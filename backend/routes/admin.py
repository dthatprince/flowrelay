from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import User, Offer, Driver
from schemas import UserResponse, UserUpdate, OfferResponse, OfferUpdate, DriverAssignment, DriverResponse, UserRole
from auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

# User Management
@router.get("/users", response_model=List[UserResponse])
def get_all_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

# Offer Management
@router.get("/offers", response_model=List[OfferResponse])
def get_all_offers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    offers = db.query(Offer).all()
    return offers

@router.put("/offers/{offer_id}/assign-driver", response_model=OfferResponse)
def assign_driver(offer_id: int, driver: DriverAssignment, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    offer.driver_first_name = driver.driver_first_name
    offer.driver_phone = driver.driver_phone
    offer.vehicle_make = driver.vehicle_make
    offer.vehicle_model = driver.vehicle_model
    offer.vehicle_color = driver.vehicle_color
    offer.vehicle_plate = driver.vehicle_plate
    offer.status = driver.status
    offer.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(offer)
    
    return offer

@router.put("/offers/{offer_id}", response_model=OfferResponse)
def admin_update_offer(offer_id: int, offer_update: OfferUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    for key, value in offer_update.dict(exclude_unset=True).items():
        setattr(offer, key, value)
    
    offer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(offer)
    
    return offer






@router.get("/drivers", response_model=List[DriverResponse])
def get_all_drivers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all driver profiles"""
    drivers = db.query(Driver).all()
    return drivers

@router.get("/drivers/available", response_model=List[DriverResponse])
def get_available_drivers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all available drivers"""
    drivers = db.query(Driver).filter(Driver.status == "available").all()
    return drivers

@router.get("/drivers/by-email/{email}")
def get_driver_by_email(email: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get driver profile by email"""
    # Find user with this email and driver role
    user = db.query(User).filter(User.email == email, User.role == UserRole.DRIVER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Driver not found with this email")
    
    # Get driver profile
    driver = db.query(Driver).filter(Driver.user_id == user.id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    return driver

@router.put("/drivers/{driver_id}/status")
def admin_update_driver_status(
    driver_id: int,
    status: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin can update driver status"""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    valid_statuses = ["available", "busy", "offline"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    driver.status = status
    driver.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Driver status updated to {status}"}

@router.put("/offers/{offer_id}/assign-driver-by-id")
def assign_driver_by_id(
    offer_id: int,
    driver_id: int,
    status: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign driver to offer using driver ID"""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Assign driver to offer
    offer.driver_id = driver.id
    offer.driver_first_name = driver.first_name
    offer.driver_phone = driver.phone_number
    offer.vehicle_make = driver.vehicle_make
    offer.vehicle_model = driver.vehicle_model
    offer.vehicle_color = driver.vehicle_color
    offer.vehicle_plate = driver.vehicle_plate
    offer.status = status
    offer.updated_at = datetime.utcnow()
    
    # Update driver status if starting delivery
    if status in ["matched", "in_progress"]:
        driver.status = "busy"
        driver.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(offer)
    
    return offer