import os
import logging
from fastapi_mail import FastMail, MessageSchema
from config import conf

logger = logging.getLogger(__name__)

async def send_verification_email(email: str, token: str):
    """
    Send verification email asynchronously
    """
    try:
        BASE_URL = os.getenv("BASE_URL", "https://flowrelay.onrender.com")
        verification_link = f"{BASE_URL}/verify-email?token={token}"

        html = f"""
        <h2>FlowRelay - Email Verification</h2>
        <p>Click below to verify your email:</p>
        <a href="{verification_link}"
           style="padding:10px 20px;background:#4CAF50;color:white;border-radius:5px;text-decoration:none;">
           Verify Email
        </a>
        """

        message = MessageSchema(
            subject="Verify Your FlowRelay Email",
            recipients=[email],
            body=html,
            subtype="html",
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"Verification email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {str(e)}")
        raise