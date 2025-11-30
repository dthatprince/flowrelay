from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import User, Offer
from schemas import UserResponse, UserUpdate, OfferResponse, OfferUpdate, DriverAssignment
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