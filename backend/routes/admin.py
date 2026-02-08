from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from database import get_db
from models import User, Offer, Driver, AccountStatus, OfferStatus
from schemas import (
    UserResponse, UserUpdate, OfferResponse, OfferUpdate, 
    DriverAssignment, DriverResponse, UserRole, AccountApproval, DriverApproval
)
from auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

# ===== USER ACCOUNT MANAGEMENT =====

@router.get("/users", response_model=List[UserResponse])
def get_all_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all users with their approval status"""
    users = db.query(User).all()
    return users

@router.get("/users/pending", response_model=List[UserResponse])
def get_pending_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get users pending approval (email verified but not admin approved)"""
    users = db.query(User).filter(
        User.is_verified == "true",
        User.account_status == AccountStatus.PENDING
    ).all()
    return users

@router.put("/users/{user_id}/approve", response_model=UserResponse)
def approve_user_account(
    user_id: int, 
    approval: AccountApproval,
    current_user: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    """Approve, reject, or suspend a user account"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Can't approve/reject yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own approval status")
    
    # Can't approve/reject other admins
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot change admin approval status")
    
    # Validate status
    valid_statuses = [AccountStatus.APPROVED, AccountStatus.REJECTED, AccountStatus.SUSPENDED]
    if approval.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: approved, rejected, suspended"
        )
    
    # Update account status
    user.account_status = approval.status
    user.approval_notes = approval.notes
    user.approved_by = current_user.id
    user.approved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, 
    user_update: UserUpdate, 
    current_user: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    """Update user information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int, 
    current_user: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

# ===== DRIVER MANAGEMENT =====

@router.get("/drivers", response_model=List[DriverResponse])
def get_all_drivers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all driver profiles with approval status"""
    drivers = db.query(Driver).all()
    return drivers

@router.get("/drivers/pending", response_model=List[DriverResponse])
def get_pending_drivers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get driver profiles pending approval"""
    drivers = db.query(Driver).filter(Driver.driver_status == AccountStatus.PENDING).all()
    return drivers

@router.get("/drivers/approved", response_model=List[DriverResponse])
def get_approved_drivers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get approved driver profiles"""
    drivers = db.query(Driver).filter(Driver.driver_status == AccountStatus.APPROVED).all()
    return drivers

@router.get("/drivers/available", response_model=List[DriverResponse])
def get_available_drivers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get approved drivers who are currently available"""
    drivers = db.query(Driver).filter(
        Driver.driver_status == AccountStatus.APPROVED,
        Driver.status == "available"
    ).all()
    return drivers

@router.get("/drivers/by-email/{email}")
def get_driver_by_email(
    email: str, 
    current_user: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    """Get driver profile by email"""
    user = db.query(User).filter(User.email == email, User.role == UserRole.DRIVER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Driver not found with this email")
    
    driver = db.query(Driver).filter(Driver.user_id == user.id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    return driver

@router.put("/drivers/{driver_id}/approve", response_model=DriverResponse)
def approve_driver(
    driver_id: int,
    approval: DriverApproval,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve, reject, or suspend a driver profile"""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Validate status
    valid_statuses = [AccountStatus.APPROVED, AccountStatus.REJECTED, AccountStatus.SUSPENDED]
    if approval.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: approved, rejected, suspended"
        )
    
    # Update driver approval status
    driver.driver_status = approval.status
    driver.driver_approval_notes = approval.notes
    driver.driver_approved_by = current_user.id
    driver.driver_approved_at = datetime.utcnow()
    
    # If approved, set operational status to available
    if approval.status == AccountStatus.APPROVED:
        driver.status = "available"
    # If rejected/suspended, set to offline
    else:
        driver.status = "offline"
    
    driver.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(driver)
    
    return driver

@router.put("/drivers/{driver_id}/status", response_model=DriverResponse)
def update_driver_approval_status(
    driver_id: int,
    status: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update driver approval status (pending/approved/rejected/suspended).
    This replaces the old operational status endpoint.
    """
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Validate approval status
    valid_statuses = ["pending", "approved", "rejected", "suspended"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    # Map string to AccountStatus enum
    status_map = {
        "pending": AccountStatus.PENDING,
        "approved": AccountStatus.APPROVED,
        "rejected": AccountStatus.REJECTED,
        "suspended": AccountStatus.SUSPENDED
    }
    
    # Update driver approval status
    driver.driver_status = status_map[status]
    driver.driver_approved_by = current_user.id
    driver.driver_approved_at = datetime.utcnow()
    
    # Automatically adjust operational status based on approval status
    if status == "approved":
        driver.status = "available"
    else:
        driver.status = "offline"
    
    driver.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(driver)
    
    return driver

# ===== OFFER MANAGEMENT =====

@router.get("/offers", response_model=List[OfferResponse])
def get_all_offers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all offers"""
    offers = db.query(Offer).all()
    return offers

@router.put("/offers/{offer_id}/assign-driver", response_model=OfferResponse)
def assign_driver(
    offer_id: int, 
    driver: DriverAssignment, 
    current_user: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    """Manually assign driver details to offer (legacy method)"""
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

@router.put("/offers/{offer_id}/assign-driver-by-id")
def assign_driver_by_id(
    offer_id: int,
    driver_id: int,
    status: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign an approved driver to an offer using driver ID"""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Check if driver is approved
    if driver.driver_status != AccountStatus.APPROVED:
        raise HTTPException(
            status_code=400, 
            detail="Cannot assign driver. Driver is not approved yet."
        )
    
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

@router.put("/offers/{offer_id}", response_model=OfferResponse)
def admin_update_offer(
    offer_id: int, 
    offer_update: OfferUpdate, 
    current_user: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    """Update offer details"""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    for key, value in offer_update.dict(exclude_unset=True).items():
        setattr(offer, key, value)
    
    offer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(offer)
    
    return offer

# ===== REPORTS =====

@router.get("/reports/trips")
def get_trips_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get trips report with optional filtering by date range and status.
    Returns trips data and summary statistics.
    """
    try:
        # Build query
        query = db.query(Offer)
        
        # Filter by status if provided
        if status and status != "all":
            if status == "completed":
                query = query.filter(Offer.status == OfferStatus.COMPLETED)
            elif status == "in_progress":
                query = query.filter(Offer.status == OfferStatus.IN_PROGRESS)
            elif status == "cancelled":
                query = query.filter(Offer.status == OfferStatus.CANCELLED)
            elif status == "matched":
                query = query.filter(Offer.status == OfferStatus.MATCHED)
            elif status == "pending":
                query = query.filter(Offer.status == OfferStatus.PENDING)
        
        # Filter by date range if provided
        if start_date:
            try:
                start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(Offer.created_at >= start_datetime)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
        
        if end_date:
            try:
                # Add one day and set to start of day to include the entire end_date
                end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
                from datetime import timedelta
                end_datetime = end_datetime + timedelta(days=1)
                query = query.filter(Offer.created_at < end_datetime)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
        
        # Order by creation date descending
        query = query.order_by(Offer.created_at.desc())
        
        # Get all matching offers
        offers = query.all()
        
        # Calculate statistics
        total_trips = len(offers)
        total_mileage = sum(offer.total_mileage or 0 for offer in offers)
        completed_trips = len([o for o in offers if o.status == OfferStatus.COMPLETED])
        in_progress_trips = len([o for o in offers if o.status == OfferStatus.IN_PROGRESS])
        cancelled_trips = len([o for o in offers if o.status == OfferStatus.CANCELLED])
        pending_trips = len([o for o in offers if o.status == OfferStatus.PENDING])
        matched_trips = len([o for o in offers if o.status == OfferStatus.MATCHED])
        
        # Get unique drivers count
        unique_drivers = len(set(o.driver_id for o in offers if o.driver_id is not None))
        
        # Get unique clients count
        unique_clients = len(set(o.client_id for o in offers))
        
        # Format offers data
        trips_data = []
        for offer in offers:
            # Get client info
            client = db.query(User).filter(User.id == offer.client_id).first()
            client_name = client.company_name if client and client.company_name else (client.email if client else "Unknown")
            
            # Get driver info if assigned
            driver_name = None
            if offer.driver_id:
                driver = db.query(Driver).filter(Driver.id == offer.driver_id).first()
                if driver:
                    driver_name = f"{driver.first_name} {driver.last_name}"
            elif offer.driver_first_name:
                driver_name = offer.driver_first_name
            
            trips_data.append({
                "id": offer.id,
                "client_name": client_name,
                "driver_name": driver_name or "Not Assigned",
                "pickup_address": offer.pickup_address,
                "dropoff_address": offer.dropoff_address,
                "pickup_date": offer.pickup_date,
                "pickup_time": offer.pickup_time,
                "total_mileage": offer.total_mileage or 0,
                "status": offer.status.value if isinstance(offer.status, OfferStatus) else offer.status,
                "created_at": offer.created_at.isoformat() if offer.created_at else None,
                "updated_at": offer.updated_at.isoformat() if offer.updated_at else None,
                "description": offer.description,
                "vehicle_info": f"{offer.vehicle_color or ''} {offer.vehicle_make or ''} {offer.vehicle_model or ''} ({offer.vehicle_plate or ''})".strip() if offer.vehicle_make else "N/A"
            })
        
        return {
            "summary": {
                "total_trips": total_trips,
                "total_mileage": round(total_mileage, 2),
                "completed_trips": completed_trips,
                "in_progress_trips": in_progress_trips,
                "cancelled_trips": cancelled_trips,
                "pending_trips": pending_trips,
                "matched_trips": matched_trips,
                "unique_drivers": unique_drivers,
                "unique_clients": unique_clients,
                "average_mileage": round(total_mileage / total_trips, 2) if total_trips > 0 else 0,
                "completion_rate": round((completed_trips / total_trips * 100), 2) if total_trips > 0 else 0
            },
            "trips": trips_data,
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "status": status
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")