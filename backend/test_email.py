# test_email.py (create this file temporarily)
from app.services.email_service import send_email

send_email(
    to_email="catalina.ernu@gmail.com",
    subject="Test from Lyra",
    html_body="<h1>Hello! This is a test email.</h1><p>If you see this, Mailjet works.</p>",
    text_body="Hello! This is a test email from Lyra."
)
print("Test sent")