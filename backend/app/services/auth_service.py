from datetime import datetime, timedelta
from jose import jwt
from app.config import settings
import smtplib
from email.mime.text import MIMEText
import logging

logger = logging.getLogger(__name__)

def create_access_token(user_id: str):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def send_email(to_email: str, subject: str, body: str):
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = settings.SMTP_USER
    msg['To'] = to_email

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
    except (smtplib.SMTPException, OSError, ValueError) as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise  # Re-raise to let caller handle
