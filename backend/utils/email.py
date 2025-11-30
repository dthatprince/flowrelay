def send_verification_email(email: str, token: str):
    """
    Simulate sending email - in production, use actual email service
    like SendGrid, AWS SES, or SMTP
    """
    verification_link = f"http://localhost:8000/verify-email?token={token}"
    print(f"Verification email sent to {email}: {verification_link}")
    # In production:
    # - Use email service provider
    # - Send HTML email template
    # - Handle email delivery errors