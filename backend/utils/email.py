#def send_verification_email(email: str, token: str):
#    """
#    Simulate sending email - in production, use actual email service
#    like SendGrid, AWS SES, or SMTP
#    """
#    verification_link = f"http://localhost:8000/verify-email?token={token}"
#    print(f"Verification email sent to {email}: {verification_link}")
    # In production:
    # - Use email service provider
    # - Send HTML email template
    # - Handle email delivery errors

import os
from fastapi_mail import FastMail, MessageSchema
from backend.config import conf   # <-- IMPORT your real config

async def send_verification_email(email: str, token: str):
    BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
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
