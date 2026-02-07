from sqlalchemy import Column, Float, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CLIENT = "client"
    DRIVER = "driver" 

class OfferStatus(str, enum.Enum):
    PENDING = "pending"
    MATCHED = "matched"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class AccountStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(SQLEnum(UserRole))
    company_name = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    company_representative = Column(String, nullable=True)
    emergency_phone = Column(String, nullable=True)
    is_verified = Column(String, default="false")
    verification_token = Column(String, nullable=True)
    
    # Account approval fields
    account_status = Column(SQLEnum(AccountStatus), default=AccountStatus.PENDING)
    approval_notes = Column(String, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    offers = relationship("Offer", back_populates="client", foreign_keys="Offer.client_id")
    # FIX: Specify which foreign key to use for driver_profile relationship
    driver_profile = relationship(
        "Driver", 
        back_populates="user", 
        uselist=False,
        foreign_keys="Driver.user_id"  # THIS IS THE FIX
    )

class Driver(Base):
    __tablename__ = "drivers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    license_number = Column(String, unique=True)
    license_expiry = Column(String)
    vehicle_make = Column(String)
    vehicle_model = Column(String)
    vehicle_year = Column(String)
    vehicle_color = Column(String)
    vehicle_plate = Column(String, unique=True)
    insurance_number = Column(String)
    insurance_expiry = Column(String)
    
    # Driver-specific approval
    driver_status = Column(SQLEnum(AccountStatus), default=AccountStatus.PENDING)
    driver_approval_notes = Column(String, nullable=True)
    driver_approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    driver_approved_at = Column(DateTime, nullable=True)
    
    status = Column(String, default="available")  # available, busy, offline
    rating = Column(String, default="5.0")
    total_deliveries = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - FIX: Specify foreign_keys
    user = relationship(
        "User", 
        back_populates="driver_profile", 
        foreign_keys=[user_id]  # THIS IS THE FIX
    )
    assigned_offers = relationship("Offer", back_populates="assigned_driver")

class Offer(Base):
    __tablename__ = "offers"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    company_representative = Column(String)
    emergency_phone = Column(String)
    description = Column(String)
    pickup_date = Column(String)
    pickup_time = Column(String)
    pickup_address = Column(String)
    dropoff_address = Column(String)
    total_mileage = Column(Float, nullable=True)
    additional_service = Column(String, nullable=True)
    status = Column(SQLEnum(OfferStatus), default=OfferStatus.PENDING)
    driver_first_name = Column(String, nullable=True)
    driver_phone = Column(String, nullable=True)
    vehicle_make = Column(String, nullable=True)
    vehicle_model = Column(String, nullable=True)
    vehicle_color = Column(String, nullable=True)
    vehicle_plate = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    client = relationship("User", back_populates="offers", foreign_keys=[client_id])
    assigned_driver = relationship("Driver", back_populates="assigned_offers")