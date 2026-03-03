"""
app/services/email_service.py

Replaced Mailjet with Gmail API (OAuth2) sending.

Setup instructions (one-time):
1. Create a Google Cloud project at https://console.cloud.google.com/
2. Enable the Gmail API for that project.
3. Create OAuth 2.0 Client Credentials -> Desktop application.
4. Download the credentials JSON and place it at the backend root as `client_secret.json`.
5. On first run the service will open a browser for consent and save `token.json` to the backend root.

Notes:
- Requires packages: google-auth-oauthlib, google-api-python-client
- This module exposes `send_email(to_email, subject, html_body, text_body=None, attachment_path=None)`
"""

import os
import base64
import mimetypes
from pathlib import Path
from typing import Optional

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from google.auth.transport.requests import Request
except Exception:
    print("[EMAIL WARNING] google libraries not available. Install google-auth-oauthlib and google-api-python-client")
    Credentials = None
    InstalledAppFlow = None
    build = None
    Request = None

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

# Paths: client_secret.json and token.json in backend root
ROOT = Path(__file__).resolve().parents[2]
CLIENT_SECRET_FILE = ROOT / "client_secret.json"
TOKEN_FILE = ROOT / "token.json"


def _get_gmail_service():
    if Credentials is None:
        raise RuntimeError("Google auth libraries not installed")

    creds = None
    if TOKEN_FILE.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
        except Exception as e:
            print(f"[EMAIL] Failed loading token.json: {e}")
            creds = None

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token and Request is not None:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"[EMAIL] Failed refreshing token: {e}")
                creds = None

    if not creds or not creds.valid:
        if not CLIENT_SECRET_FILE.exists():
            raise RuntimeError(f"client_secret.json not found at {CLIENT_SECRET_FILE}. Follow setup instructions in this file.")
        flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_FILE), SCOPES)
        creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    service = build("gmail", "v1", credentials=creds)
    return service


def _create_message(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None, attachment_path: Optional[str] = None):
    message = MIMEMultipart()
    message["To"] = to_email
    message["Subject"] = subject

    if text_body:
        part1 = MIMEText(text_body, "plain")
        message.attach(part1)

    part2 = MIMEText(html_body, "html")
    message.attach(part2)

    if attachment_path:
        path = Path(attachment_path)
        if path.exists():
            ctype, encoding = mimetypes.guess_type(str(path))
            if ctype is None or encoding is not None:
                ctype = "application/octet-stream"
            maintype, subtype = ctype.split("/", 1)
            with open(path, "rb") as f:
                mime = MIMEBase(maintype, subtype)
                mime.set_payload(f.read())
            encoders.encode_base64(mime)
            mime.add_header("Content-Disposition", "attachment", filename=path.name)
            message.attach(mime)

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {"raw": raw}


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None, attachment_path: Optional[str] = None):
    """Send an email via Gmail API.

    Parameters:
        to_email: recipient email address
        subject: email subject
        html_body: HTML content
        text_body: optional plain text content
        attachment_path: optional path to a file to attach
    """
    try:
        service = _get_gmail_service()
    except Exception as e:
        print(f"[EMAIL ERROR] Unable to get Gmail service: {e}")
        return

    msg = _create_message(to_email, subject, html_body, text_body, attachment_path)
    try:
        sent = service.users().messages().send(userId="me", body=msg).execute()
        print(f"[EMAIL SENT] id={sent.get('id')} to={to_email}")
    except Exception as e:
        print(f"[EMAIL FAILED] to={to_email} error={e}")