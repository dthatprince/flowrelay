from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import User, Driver, Offer, OfferStatus, UserRole, AccountStatus
from schemas import (
    DriverCreate, DriverUpdate, DriverResponse, 
    OfferAcceptance, OfferStatusUpdate
)
from schemas.offer import OfferResponse
from auth import get_current_user

router = APIRouter(prefix="/driver", tags=["Driver"])

# Helper function to check if user is driver
def require_driver(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Driver access required")
    return current_user

# Helper to check if driver profile is approved
def require_approved_driver(current_user: User = Depends(require_driver), db: Session = Depends(get_db)) -> Driver:
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found. Please create one.")
    
    if driver.driver_status == AccountStatus.PENDING:
        raise HTTPException(
            status_code=403,
            detail="Your driver profile is pending admin approval. Please wait for approval."
        )
    elif driver.driver_status == AccountStatus.REJECTED:
        raise HTTPException(
            status_code=403,
            detail="Your driver profile has been rejected. Please contact support."
        )
    elif driver.driver_status == AccountStatus.SUSPENDED:
        raise HTTPException(
            status_code=403,
            detail="Your driver profile has been suspended. Please contact support."
        )
    
    return driver

# ===== DRIVER PROFILE MANAGEMENT =====

@router.post("/profile", response_model=DriverResponse)
def create_driver_profile(
    driver_data: DriverCreate,
    current_user: User = Depends(require_driver),
    db: Session = Depends(get_db)
):
    """Create driver profile (first time setup) - Will be pending admin approval"""
    # Check if profile already exists
    existing_driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if existing_driver:
        raise HTTPException(status_code=400, detail="Driver profile already exists")
    
    # Check license uniqueness
    if db.query(Driver).filter(Driver.license_number == driver_data.license_number).first():
        raise HTTPException(status_code=400, detail="License number already registered")
    
    # Check plate uniqueness
    if db.query(Driver).filter(Driver.vehicle_plate == driver_data.vehicle_plate).first():
        raise HTTPException(status_code=400, detail="Vehicle plate already registered")
    
    # Create driver profile with PENDING status
    new_driver = Driver(
        user_id=current_user.id,
        first_name=driver_data.first_name,
        last_name=driver_data.last_name,
        phone_number=driver_data.phone_number,
        license_number=driver_data.license_number,
        license_expiry=driver_data.license_expiry,
        vehicle_make=driver_data.vehicle_make,
        vehicle_model=driver_data.vehicle_model,
        vehicle_year=driver_data.vehicle_year,
        vehicle_color=driver_data.vehicle_color,
        vehicle_plate=driver_data.vehicle_plate,
        insurance_number=driver_data.insurance_number,
        insurance_expiry=driver_data.insurance_expiry,
        driver_status=AccountStatus.PENDING,  # Pending admin approval
        status="offline"  # Offline until approved
    )
    
    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)
    
    return new_driver

@router.get("/profile", response_model=DriverResponse)
def get_driver_profile(
    current_user: User = Depends(require_driver),
    db: Session = Depends(get_db)
):
    """Get driver's profile (regardless of approval status)"""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found. Please create one.")
    
    return driver

@router.put("/profile", response_model=DriverResponse)
def update_driver_profile(
    driver_update: DriverUpdate,
    current_user: User = Depends(require_driver),
    db: Session = Depends(get_db)
):
    """Update driver profile - Only pending/approved drivers can update"""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    # Don't allow updates if rejected or suspended
    if driver.driver_status in [AccountStatus.REJECTED, AccountStatus.SUSPENDED]:
        raise HTTPException(
            status_code=403,
            detail="Cannot update profile. Profile is rejected or suspended."
        )
    
    # Check license uniqueness if updating
    if driver_update.license_number and driver_update.license_number != driver.license_number:
        if db.query(Driver).filter(Driver.license_number == driver_update.license_number).first():
            raise HTTPException(status_code=400, detail="License number already registered")
    
    # Check plate uniqueness if updating
    if driver_update.vehicle_plate and driver_update.vehicle_plate != driver.vehicle_plate:
        if db.query(Driver).filter(Driver.vehicle_plate == driver_update.vehicle_plate).first():
            raise HTTPException(status_code=400, detail="Vehicle plate already registered")
    
    # Update fields
    for key, value in driver_update.dict(exclude_unset=True).items():
        setattr(driver, key, value)
    
    driver.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(driver)
    
    return driver

@router.put("/status")
def update_driver_status(
    status: str,
    driver: Driver = Depends(require_approved_driver),
    db: Session = Depends(get_db)
):
    """Update driver availability status - Only approved drivers can change status"""
    valid_statuses = ["available", "busy", "offline"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    driver.status = status
    driver.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Status updated to {status}"}

# ===== OFFER MANAGEMENT (Only approved drivers) =====

@router.get("/offers/available", response_model=List[OfferResponse])
def get_available_offers(
    driver: Driver = Depends(require_approved_driver),
    db: Session = Depends(get_db)
):
    """Get all available offers - Only approved drivers can see offers"""
    offers = db.query(Offer).filter(
        Offer.status == OfferStatus.PENDING,
        Offer.driver_id == None
    ).all()
    
    return offers

@router.get("/offers/my-assignments", response_model=List[OfferResponse])
def get_my_assignments(
    driver: Driver = Depends(require_approved_driver),
    db: Session = Depends(get_db)
):
    """Get all offers assigned to this driver"""
    offers = db.query(Offer).filter(Offer.driver_id == driver.id).all()
    return offers

@router.get("/offers/active", response_model=List[OfferResponse])
def get_active_offers(
    driver: Driver = Depends(require_approved_driver),
    db: Session = Depends(get_db)
):
    """Get driver's active offers (matched or in_progress)"""
    offers = db.query(Offer).filter(
        Offer.driver_id == driver.id,
        Offer.status.in_([OfferStatus.MATCHED, OfferStatus.IN_PROGRESS])
    ).all()
    
    return offers

@router.get("/offers/{offer_id}", response_model=OfferResponse)
def get_offer_details(
    offer_id: int,
    current_user: User = Depends(require_driver),
    db: Session = Depends(get_db)
):
    """Get specific offer details"""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    return offer

@router.post("/offers/{offer_id}/accept")
def accept_offer(
    offer_id: int,
    driver: Driver = Depends(require_approved_driver),
    db: Session = Depends(get_db)
):
    """Accept an available offer - Only approved drivers can accept"""
    # Check if driver is available
    if driver.status != "available":
        raise HTTPException(status_code=400, detail="Driver must be available to accept offers")
    
    # Get offer
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    # Check if offer is available
    if offer.status != OfferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Offer is not available")
    
    if offer.driver_id is not None:
        raise HTTPException(status_code=400, detail="Offer already assigned to another driver")
    
    # Assign driver to offer
    offer.driver_id = driver.id
    offer.driver_first_name = driver.first_name
    offer.driver_phone = driver.phone_number
    offer.vehicle_make = driver.vehicle_make
    offer.vehicle_model = driver.vehicle_model
    offer.vehicle_color = driver.vehicle_color
    offer.vehicle_plate = driver.vehicle_plate
    offer.status = OfferStatus.MATCHED
    offer.updated_at = datetime.utcnow()
    
    # Update driver status
    driver.status = "busy"
    driver.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Offer accepted successfully", "offer_id": offer_id}

@router.put("/offers/{offer_id}/status")
def update_offer_status(
    offer_id: int,
    status_update: OfferStatusUpdate,
    driver: Driver = Depends(require_approved_driver),
    db: Session = Depends(get_db)
):
    """Update offer status - Only approved drivers can update"""
    # Get offer
    offer = db.query(Offer).filter(
        Offer.id == offer_id,
        Offer.driver_id == driver.id
    ).first()
    
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found or not assigned to you")
    
    # Validate status transitions
    valid_statuses = ["in_progress", "completed", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Update offer status
    if status_update.status == "in_progress":
        if offer.status != OfferStatus.MATCHED:
            raise HTTPException(status_code=400, detail="Can only start matched offers")
        offer.status = OfferStatus.IN_PROGRESS
        
    elif status_update.status == "completed":
        if offer.status != OfferStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Can only complete in-progress offers")
        offer.status = OfferStatus.COMPLETED
        
        # Update driver stats
        driver.total_deliveries += 1
        driver.status = "available"
        
    elif status_update.status == "cancelled":
        offer.status = OfferStatus.CANCELLED
        driver.status = "available"
    
    offer.updated_at = datetime.utcnow()
    driver.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": f"Offer status updated to {status_update.status}",
        "offer_id": offer_id,
        "new_status": status_update.status
    }

# ===== STATISTICS & HISTORY =====

@router.get("/statistics")
def get_driver_statistics(
    driver: Driver = Depends(require_approved_driver),
    db: Session = Depends(get_db)
):
    """Get driver statistics - Only approved drivers"""
    # Count offers by status
    total_assigned = db.query(Offer).filter(Offer.driver_id == driver.id).count()
    completed = db.query(Offer).filter(
        Offer.driver_id == driver.id,
        Offer.status == OfferStatus.COMPLETED
    ).count()
    in_progress = db.query(Offer).filter(
        Offer.driver_id == driver.id,
        Offer.status == OfferStatus.IN_PROGRESS
    ).count()
    matched = db.query(Offer).filter(
        Offer.driver_id == driver.id,
        Offer.status == OfferStatus.MATCHED
    ).count()
    cancelled = db.query(Offer).filter(
        Offer.driver_id == driver.id,
        Offer.status == OfferStatus.CANCELLED
    ).count()
    
    return {
        "driver_info": {
            "name": f"{driver.first_name} {driver.last_name}",
            "status": driver.status,
            "driver_status": driver.driver_status,
            "rating": driver.rating,
            "total_deliveries": driver.total_deliveries
        },
        "statistics": {
            "total_assigned": total_assigned,
            "completed": completed,
            "in_progress": in_progress,
            "matched": matched,
            "cancelled": cancelled
        }
    }

@router.get("/history", response_model=List[OfferResponse])
def get_delivery_history(
    limit: int = 50,
    driver: Driver = Depends(require_approved_driver),
    db: Session = Depends(get_db)
):
    """Get driver's delivery history - Only approved drivers"""
    offers = db.query(Offer).filter(
        Offer.driver_id == driver.id,
        Offer.status.in_([OfferStatus.COMPLETED, OfferStatus.CANCELLED])
    ).order_by(Offer.updated_at.desc()).limit(limit).all()
    
    return offers