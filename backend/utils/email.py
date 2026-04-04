from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from config import (
    MAIL_USERNAME,
    MAIL_PASSWORD,
    MAIL_FROM,
    MAIL_PORT,
    MAIL_SERVER,
    MAIL_STARTTLS,
    MAIL_SSL_TLS,
    USE_CREDENTIALS,
    BASE_URL
)

conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_PORT=MAIL_PORT,
    MAIL_STARTTLS=MAIL_STARTTLS,
    MAIL_SSL_TLS=MAIL_SSL_TLS,
    USE_CREDENTIALS=USE_CREDENTIALS,
)

# ─── Shared layout ─────────────────────────────────────────────────────────────

def _base_template(title: str, body_html: str) -> str:
    """Wraps any email body in a clean, professional SaaS layout."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
  <style>
    body {{
      margin: 0; padding: 0;
      background-color: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #374151;
    }}
    .wrapper {{
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07);
    }}
    .header {{
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      padding: 32px 40px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }}
    .header p {{
      margin: 6px 0 0;
      color: rgba(255,255,255,0.8);
      font-size: 14px;
    }}
    .body {{
      padding: 40px;
    }}
    .body h2 {{
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: 600;
      color: #111827;
    }}
    .body p {{
      margin: 0 0 16px;
      font-size: 15px;
      line-height: 1.6;
      color: #6b7280;
    }}
    .btn {{
      display: inline-block;
      margin: 8px 0 24px;
      padding: 14px 32px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }}
    .btn-danger {{
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    }}
    .divider {{
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 28px 0;
    }}
    .info-box {{
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
      font-size: 14px;
      color: #6b7280;
    }}
    .info-box strong {{ color: #374151; }}
    .warning-box {{
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 13px;
      color: #92400e;
    }}
    .link-fallback {{
      word-break: break-all;
      font-size: 13px;
      color: #9ca3af;
    }}
    .footer {{
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 24px 40px;
      text-align: center;
    }}
    .footer p {{
      margin: 4px 0;
      font-size: 12px;
      color: #9ca3af;
    }}
    .footer a {{
      color: #3b82f6;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Flow Relay</h1>
      <p>Your reliable transport partner</p>
    </div>
    <div class="body">
      {body_html}
    </div>
    <div class="footer">
      <p>© 2025 Flow Relay. All rights reserved.</p>
      <p>If you didn't request this email, you can safely ignore it.</p>
      <p><a href="{BASE_URL}">flowrelay.onrender.com</a></p>
    </div>
  </div>
</body>
</html>"""


# ─── Email senders ─────────────────────────────────────────────────────────────

async def send_verification_email(email: str, token: str):
    """Sent after signup — asks the user to verify their email address."""
    verification_link = f"{BASE_URL}/verify-email.html?token={token}"

    body = f"""
      <h2>Verify your email address</h2>
      <p>Thanks for signing up for Flow Relay! Before you can log in, please confirm
         your email address by clicking the button below.</p>
      <a href="{verification_link}" class="btn">Verify Email Address</a>
      <hr class="divider"/>
      <div class="info-box">
        <strong>This link expires in 24 hours.</strong><br/>
        If the button above doesn't work, copy and paste this URL into your browser:<br/>
        <span class="link-fallback">{verification_link}</span>
      </div>
      <div class="warning-box">
        &#9888; If you didn't create a Flow Relay account, please ignore this email.
        No action is needed.
      </div>
    """

    message = MessageSchema(
        subject="Verify your Flow Relay account",
        recipients=[email],
        body=_base_template("Verify your email — Flow Relay", body),
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    await fm.send_message(message)


async def send_password_reset_email(email: str, token: str):
    """Sent when a user requests a password reset via Forgot Password."""
    reset_link = f"{BASE_URL}/reset-password.html?token={token}"

    body = f"""
      <h2>Reset your password</h2>
      <p>We received a request to reset the password for the Flow Relay account
         associated with <strong>{email}</strong>.</p>
      <p>Click the button below to choose a new password:</p>
      <a href="{reset_link}" class="btn btn-danger">Reset Password</a>
      <hr class="divider"/>
      <div class="info-box">
        <strong>This link expires in 1 hour.</strong><br/>
        If the button above doesn't work, copy and paste this URL into your browser:<br/>
        <span class="link-fallback">{reset_link}</span>
      </div>
      <div class="warning-box">
        &#9888; If you didn't request a password reset, please ignore this email.
        Your password will <strong>not</strong> be changed. If you're concerned about
        your account security, contact our support team immediately.
      </div>
    """

    message = MessageSchema(
        subject="Reset your Flow Relay password",
        recipients=[email],
        body=_base_template("Password reset — Flow Relay", body),
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    await fm.send_message(message)


async def send_password_changed_email(email: str):
    """Security confirmation sent after any successful password change."""
    from datetime import datetime
    timestamp = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

    body = f"""
      <h2>Your password was changed</h2>
      <p>This is a confirmation that the password for your Flow Relay account
         (<strong>{email}</strong>) was successfully changed on
         <strong>{timestamp}</strong>.</p>
      <div class="info-box">
        <strong>Wasn't you?</strong><br/>
        If you didn't make this change, your account may be compromised.
        Please reset your password immediately and contact our support team.
      </div>
      <a href="{BASE_URL}/index.html" class="btn">Go to Login</a>
    """

    message = MessageSchema(
        subject="Your Flow Relay password was changed",
        recipients=[email],
        body=_base_template("Password changed — Flow Relay", body),
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    await fm.send_message(message)