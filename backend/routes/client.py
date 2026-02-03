from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import User, Offer, OfferStatus, AccountStatus
from schemas import OfferCreate, OfferUpdate, OfferResponse
from auth import get_current_user

router = APIRouter(prefix="/offers", tags=["Client Offers"])

# Helper to ensure client is approved
def require_approved_client(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user is an approved client"""
    if current_user.account_status != AccountStatus.APPROVED:
        if current_user.account_status == AccountStatus.PENDING:
            raise HTTPException(
                status_code=403,
                detail="Your account is pending admin approval. Please wait for approval to create offers."
            )
        elif current_user.account_status == AccountStatus.REJECTED:
            raise HTTPException(
                status_code=403,
                detail="Your account has been rejected. Please contact support."
            )
        elif current_user.account_status == AccountStatus.SUSPENDED:
            raise HTTPException(
                status_code=403,
                detail="Your account has been suspended. Please contact support."
            )
    return current_user

@router.post("", response_model=OfferResponse)
def create_offer(
    offer: OfferCreate, 
    current_user: User = Depends(require_approved_client), 
    db: Session = Depends(get_db)
):
    """Create a new offer - Only approved clients can create offers"""
    new_offer = Offer(
        client_id=current_user.id,
        company_representative=offer.company_representative,
        emergency_phone=offer.emergency_phone,
        description=offer.description,
        pickup_date=offer.pickup_date,
        pickup_time=offer.pickup_time,
        pickup_address=offer.pickup_address,
        dropoff_address=offer.dropoff_address,
        additional_service=offer.additional_service
    )
    
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)
    
    return new_offer

@router.get("/my", response_model=List[OfferResponse])
def get_my_offers(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get all offers created by current user - Works for any verified user"""
    offers = db.query(Offer).filter(Offer.client_id == current_user.id).all()
    return offers

@router.get("/{offer_id}", response_model=OfferResponse)
def get_offer(
    offer_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get specific offer details - User must own the offer"""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this offer")
    
    return offer

@router.put("/{offer_id}", response_model=OfferResponse)
def update_offer(
    offer_id: int, 
    offer_update: OfferUpdate, 
    current_user: User = Depends(require_approved_client), 
    db: Session = Depends(get_db)
):
    """Update an offer - Only approved clients can update, only pending offers"""
    offer = db.query(Offer).filter(Offer.id == offer_id, Offer.client_id == current_user.id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.status != OfferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only update pending offers")
    
    for key, value in offer_update.dict(exclude_unset=True).items():
        setattr(offer, key, value)
    
    offer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(offer)
    
    return offer