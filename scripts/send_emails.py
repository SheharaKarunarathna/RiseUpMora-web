import os
import smtplib
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

# Optional: load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

# Email configuration for dual accounts
ACCOUNTS = [
    {
        "user": os.getenv("EMAIL_USER_1", os.getenv("EMAIL_USER", "capriqorn.rx4@gmail.com")),
        "pass": os.getenv("EMAIL_PASS_1", os.getenv("EMAIL_PASS", "hfyo xvoe rjem ktpx")),
        "name": "Sender 1"
    },
    {
        "user": os.getenv("EMAIL_USER_2", os.getenv("EMAIL_USER", "capriqorn.rx4@gmail.com")),
        "pass": os.getenv("EMAIL_PASS_2", os.getenv("EMAIL_PASS", "hfyo xvoe rjem ktpx")),
        "name": "Sender 2"
    }
]

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_NAME = "Rise Up Mora"

DEFAULT_SUBJECT = "Companies Available to Select Now! Reserve Your Spot - Rise Up Mora"

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Company Selection Open Now</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background-color: #f8fcfe; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,36,84,0.08); border: 1px solid rgba(0,36,84,0.1); }
    .header { background-color: #002454; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header h1 span { color: #f6c430; }
    .content { padding: 36px 32px; color: #333333; }
    .content h2 { color: #002454; margin-top: 0; font-size: 20px; font-weight: 800; }
    .content p { line-height: 1.6; margin-bottom: 20px; color: #4a5568; }
    .footer { background-color: #f8fcfe; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid rgba(0,36,84,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rise Up <span>Mora</span></h1>
    </div>
    <div class="content">
      <h2>Company Selection is Now Open!</h2>
      <p>Hello Candidate,</p>
      <div style="background-color: #fefce8; border-left: 4px solid #f6c430; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; color: #744210; font-weight: 700; font-size: 15px;">
          🚀 Companies are available to select now! Quickly reserve your spot. Seats are limited!
        </p>
      </div>
      <p>Log in to your candidate dashboard to rank your preferred companies and select your time slots before capacity is reached.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="http://localhost:3000/candidate/application" style="background-color: #f6c430; color: #002454; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; display: inline-block; font-size: 16px;">Select Companies &amp; Time Slots</a>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 Rise Up Mora. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

def send_single_email(account_info, recipient, idx, total_count, subject=DEFAULT_SUBJECT, html_content=HTML_TEMPLATE):
    """
    Connects to SMTP and sends one email using the assigned account info.
    """
    user = account_info["user"]
    pwd = account_info["pass"]
    account_name = account_info["name"]

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(user, pwd)

        msg = MIMEMultipart("alternative")
        msg["From"] = f'"{SENDER_NAME}" <{user}>'
        msg["To"] = recipient
        msg["Subject"] = subject
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        server.sendmail(user, recipient, msg.as_string())
        server.quit()

        print(f"[{idx}/{total_count}] 🚀 [{account_name} ({user})] Email sent to: {recipient}")
        return True
    except Exception as err:
        print(f"[{idx}/{total_count}] ❌ [{account_name} ({user})] Failed to send to {recipient}: {err}")
        return False

def send_bulk_emails(recipients, subject=DEFAULT_SUBJECT, html_content=HTML_TEMPLATE):
    """
    Sends emails in batches of 10 (5 via Account 1, 5 via Account 2) using thread pool.
    """
    print("=" * 70)
    print("  RiseUpMora — High-Speed Dual-Account Python Email Sender")
    print("=" * 70)
    print(f"  Account 1 : {ACCOUNTS[0]['user']}")
    print(f"  Account 2 : {ACCOUNTS[1]['user']}")
    print(f"  Batching  : 5 (Account 1) + 5 (Account 2) = 10 parallel emails / batch")
    print("=" * 70 + "\n")

    total_count = len(recipients)
    success_count = 0
    failure_count = 0
    start_time = time.time()

    batch_size = 10

    for i in range(0, total_count, batch_size):
        chunk = recipients[i:i + batch_size]
        group1 = chunk[0:5] # Sent via Account 1
        group2 = chunk[5:10] # Sent via Account 2

        print(f"\n📦 Processing Batch [{i + 1} - {min(i + batch_size, total_count)} / {total_count}]...")

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            # Dispatch group 1 using Account 1
            for g_idx, rec in enumerate(group1):
                futures.append(executor.submit(send_single_email, ACCOUNTS[0], rec.strip(), i + g_idx + 1, total_count, subject, html_content))

            # Dispatch group 2 using Account 2
            for g_idx, rec in enumerate(group2):
                futures.append(executor.submit(send_single_email, ACCOUNTS[1], rec.strip(), i + 5 + g_idx + 1, total_count, subject, html_content))

            for future in as_completed(futures):
                if future.result():
                    success_count += 1
                else:
                    failure_count += 1

        if i + batch_size < total_count:
            time.sleep(0.5)

    duration = round(time.time() - start_time, 1)

    print("\n" + "=" * 70)
    print("  BULK EMAIL SENDING COMPLETE")
    print("=" * 70)
    print(f"  Total Recipients : {total_count}")
    print(f"  Successfully Sent: {success_count}")
    print(f"  Failed           : {failure_count}")
    print(f"  Time Elapsed     : {duration} seconds")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    sample_recipients = [
        "kalharaj.23@cse.mrt.ac.lk",
        "kalharajay@gmail.com",
        "kisajab72@gmail.com",
    ]
    send_bulk_emails(sample_recipients)
