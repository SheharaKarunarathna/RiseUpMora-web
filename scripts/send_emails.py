import os
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

# Optional: load environment variables from .env file if python-dotenv is installed
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

# Email configuration matching the Rise Up Mora codebase
EMAIL_USER = os.getenv("EMAIL_USER", "capriqorn.rx4@gmail.com")
EMAIL_PASS = os.getenv("EMAIL_PASS", "hfyo xvoe rjem ktpx")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_NAME = "Rise Up Mora"

# List of target recipients
RECIPIENTS = [
    # Add your list of email addresses here
    "example1@gmail.com",
    "example2@gmail.com",
]

DEFAULT_SUBJECT = "Important Update from Rise Up Mora"

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rise Up Mora Update</title>
  <style>
    body {{ font-family: 'Inter', Arial, sans-serif; background-color: #f8fcfe; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,36,84,0.08); border: 1px solid rgba(0,36,84,0.1); }}
    .header {{ background-color: #002454; padding: 32px 24px; text-align: center; }}
    .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
    .header h1 span {{ color: #f6c430; }}
    .content {{ padding: 36px 32px; color: #333333; }}
    .content h2 {{ color: #002454; margin-top: 0; font-size: 20px; font-weight: 800; }}
    .content p {{ line-height: 1.6; margin-bottom: 20px; color: #4a5568; }}
    .footer {{ background-color: #f8fcfe; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid rgba(0,36,84,0.05); }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rise Up <span>Mora</span></h1>
    </div>
    <div class="content">
      <h2>Hello Candidate,</h2>
      <p>This is an automated notification regarding your participation in <strong>Rise Up Mora</strong>.</p>
      <p>Please check your candidate dashboard regularly for updates regarding time slots and mock interview schedules.</p>
    </div>
    <div class="footer">
      &copy; 2026 Rise Up Mora. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

def send_bulk_emails(recipients, subject=DEFAULT_SUBJECT, html_content=HTML_TEMPLATE, delay_seconds=1.0):
    """
    Sends email to a list of recipients using the Gmail SMTP configuration from .env
    """
    if not EMAIL_USER or not EMAIL_PASS:
        print("❌ Error: EMAIL_USER or EMAIL_PASS environment variables are not set.")
        return

    print(f"📧 Initializing SMTP connection to {SMTP_HOST}:{SMTP_PORT} using account {EMAIL_USER}...")
    
    try:
        # Establish TLS SMTP Connection
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        print("✅ SMTP Server Authentication Successful!\n")

        success_count = 0
        failure_count = 0

        for idx, recipient in enumerate(recipients, start=1):
            recipient = recipient.strip()
            if not recipient:
                continue

            try:
                # Create MIME Email Message
                msg = MIMEMultipart("alternative")
                msg["From"] = f'"{SENDER_NAME}" <{EMAIL_USER}>'
                msg["To"] = recipient
                msg["Subject"] = subject

                # Attach HTML Content
                html_part = MIMEText(html_content, "html", "utf-8")
                msg.attach(html_part)

                # Send Email
                server.sendmail(EMAIL_USER, recipient, msg.as_string())
                print(f"[{idx}/{len(recipients)}] 🚀 Email sent successfully to: {recipient}")
                success_count += 1

                # Rate limiting delay
                if delay_seconds > 0 and idx < len(recipients):
                    time.sleep(delay_seconds)

            except Exception as mail_err:
                print(f"[{idx}/{len(recipients)}] ❌ Failed to send email to {recipient}: {mail_err}")
                failure_count += 1

        server.quit()
        print(f"\n✨ Bulk Email Sending Complete! Success: {success_count}, Failed: {failure_count}")

    except Exception as server_err:
        print(f"❌ Connection or Authentication Error: {server_err}")

if __name__ == "__main__":
    # Example usage:
    # Set target recipients list below
    target_recipients = [
        "kalharaj.23@cse.mrt.ac.lk",
        # "student2@cse.mrt.ac.lk",
    ]
    
    send_bulk_emails(
        recipients=target_recipients,
        subject="Important Notice - Rise Up Mora",
        html_content=HTML_TEMPLATE
    )
