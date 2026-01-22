# app/services/email_service.py
from mailjet_rest import Client
from app.config import settings
from fastapi import HTTPException

def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    if not all([settings.MAILJET_API_KEY, settings.MAILJET_SECRET_KEY, settings.MAILJET_FROM_EMAIL]):
        print("[EMAIL WARNING] Mailjet credentials missing — email not sent")
        return

    mailjet = Client(auth=(settings.MAILJET_API_KEY, settings.MAILJET_SECRET_KEY), version='v3.1')

    data = {
        'Messages': [
            {
                "From": {"Email": settings.MAILJET_FROM_EMAIL, "Name": settings.MAILJET_FROM_NAME},
                "To": [{"Email": to_email}],
                "Subject": subject,
                "TextPart": text_body or "Plain text fallback",
                "HTMLPart": html_body,
                "CustomID": "LyraReset-" + to_email
            }
        ]
    }

    try:
        result = mailjet.send.create(data=data)
        print(f"[MAILJET FULL RESPONSE] Status: {result.status_code}")
        print(f"[MAILJET BODY] {result.json()}")
        if result.status_code == 200:
            print(f"[EMAIL SUCCESS] Sent to {to_email} - MessageID: {result.json()['Messages'][0]['MessageID']}")
        else:
            print(f"[EMAIL FAIL] {result.status_code}: {result.json()}")
    except Exception as e:
        print(f"[EMAIL EXCEPTION] {str(e)}")