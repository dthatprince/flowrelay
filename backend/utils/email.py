import os
import logging
import resend

logger = logging.getLogger(__name__)

# Initialize Resend with API key
resend.api_key = os.getenv("RESEND_API_KEY")

async def send_verification_email(email: str, token: str):
    """
    Send verification email using Resend API
    """
    try:
        logger.info(f"Starting email send process for {email}")
        
        BASE_URL = os.getenv("BASE_URL", "https://flowrelay.onrender.com")
        verification_link = f"{BASE_URL}/verify-email?token={token}"
        
        logger.info(f"Verification link: {verification_link}")

        html = f"""
        <h2>FlowRelay - Email Verification</h2>
        <p>Click below to verify your email:</p>
        <a href="{verification_link}"
           style="padding:10px 20px;background:#4CAF50;color:white;border-radius:5px;text-decoration:none;">
           Verify Email
        </a>
        <p>Or copy this link: {verification_link}</p>
        """

        # Send email using Resend with default sender
        email_response = resend.Emails.send({
            "to": [email],
            "subject": "Verify Your FlowRelay Email",
            "html": html,
        })
        
        logger.info(f"✓ Verification email successfully sent to {email}")
        logger.info(f"Email response: {email_response}")
        return email_response
        
    except Exception as e:
        logger.error(f"✗ Failed to send verification email to {email}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.exception("Full traceback:")
        raise