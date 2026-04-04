import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv("/etc/secrets/env_file")

# App environment
ENV = os.getenv("ENV", "dev")

# Security
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Short-lived access token (15 min) — lives in JS memory only
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))

# Long-lived refresh token (7 days) — stored in HttpOnly cookie only
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# Base URL
BASE_URL = os.getenv("BASE_URL")

# Mail settings
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")

MAIL_PORT = int(os.getenv("MAIL_PORT", 465))
MAIL_SERVER = os.getenv("MAIL_SERVER")

MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "False") == "True"
MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "True") == "True"
USE_CREDENTIALS = os.getenv("USE_CREDENTIALS", "True") == "True"