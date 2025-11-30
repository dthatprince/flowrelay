import os
from dotenv import load_dotenv
from fastapi_mail import ConnectionConfig

# Load .env file
load_dotenv()  

# Security & JWT
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
