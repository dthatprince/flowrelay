import os
import httpx
import logging
from config import PROMAILER_API_KEY, FROM_EMAIL, BASE_URL

logger = logging.getLogger(__name__)

PROMAILER_API_URL = "https://api.mailbridge.dev/v1/messages/send"

async def send_verification_email(to_email: str, token: str):
    """
    Sends a verification email using Promailer API
    """
    verification_link = f"{BASE_URL}/verify-email?token={token}"

    html_content = f"""
    <h2>FlowRelay - Email Verification</h2>
    <p>Click the link below to verify your email:</p>
    <a href="{verification_link}" 
       style="padding:10px 20px; background:#4CAF50; color:white; border-radius:5px; text-decoration:none;">
       Verify Email
    </a>
    <p>Or copy this link: {verification_link}</p>
    """

    payload = {
        "to": to_email,
        "subject": "Verify Your FlowRelay Email",
        "html": html_content,
        "from": FROM_EMAIL
    }

    headers = {
        "Authorization": f"Bearer {PROMAILER_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(PROMAILER_API_URL, headers=headers, json=payload)
            data = response.json()

            if data.get("success"):
                logger.info(f"✓ Verification email sent to {to_email}")
            else:
                logger.error(f"✗ Failed to send email to {to_email}: {data}")

            return data

    except Exception as e:
        logger.exception(f"✗ Exception while sending email to {to_email}: {e}")
        raise
