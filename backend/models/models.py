from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CLIENT = "client"

class OfferStatus(str, enum.Enum):
    PENDING = "pending"
    MATCHED = "matched"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

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
    created_at = Column(DateTime, default=datetime.utcnow)
    
    offers = relationship("Offer", back_populates="client")

class Offer(Base):
    __tablename__ = "offers"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"))
    company_representative = Column(String)
    emergency_phone = Column(String)
    description = Column(String)
    pickup_date = Column(String)
    pickup_time = Column(String)
    pickup_address = Column(String)
    dropoff_address = Column(String)
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
    
    client = relationship("User", back_populates="offers")
    