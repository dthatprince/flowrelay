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

'''
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_HOST=os.getenv("MAIL_HOST"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 465)),
    MAIL_USE_TLS=os.getenv("MAIL_USE_TLS", "False") == "True",
    MAIL_SSL_TLS=os.getenv("MAIL_USE_SSL", "True") == "True",
    USE_CREDENTIALS=True,
)
'''

# Promailer config
PROMAILER_API_KEY = os.getenv("PROMAILER_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@promailer.dev")