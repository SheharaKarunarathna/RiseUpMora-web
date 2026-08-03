require("dotenv").config();
const nodemailer = require("nodemailer");

// Email transporter using codebase credentials from .env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "capriqorn.rx4@gmail.com",
    pass: process.env.EMAIL_PASS || "hfyo xvoe rjem ktpx",
  },
});

// List of recipient email addresses
const RECIPIENTS = [
  "kisajab72@gmail.com",
  "kalharajay@gmail.com",
  "kalharaj.23@cse.mrt.ac.lk",
];

const SUBJECT = "Companies Available to Select Now! Reserve Your Spot - Rise Up Mora";

const HTML_TEMPLATE = `<!DOCTYPE html>
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
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/application" style="background-color: #f6c430; color: #002454; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; display: inline-block; font-size: 16px;">Select Companies &amp; Time Slots</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Rise Up Mora. All rights reserved.
    </div>
  </div>
</body>
</html>`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendBulkEmails() {
  const emailUser = process.env.EMAIL_USER || "capriqorn.rx4@gmail.com";
  console.log(`\n📧 Sending bulk emails via ${emailUser}...`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < RECIPIENTS.length; i++) {
    const recipient = RECIPIENTS[i].trim();
    if (!recipient) continue;

    try {
      const info = await transporter.sendMail({
        from: `"Rise Up Mora" <${emailUser}>`,
        to: recipient,
        subject: SUBJECT,
        html: HTML_TEMPLATE,
      });

      console.log(`[${i + 1}/${RECIPIENTS.length}] 🚀 Email sent to: ${recipient} (Message ID: ${info.messageId})`);
      successCount++;

      // 1-second delay between emails
      if (i < RECIPIENTS.length - 1) {
        await sleep(1000);
      }
    } catch (err) {
      console.error(`[${i + 1}/${RECIPIENTS.length}] ❌ Failed to send email to ${recipient}:`, err.message);
      failureCount++;
    }
  }

  console.log(`\n✨ Bulk email sending completed! Success: ${successCount}, Failed: ${failureCount}\n`);
}

sendBulkEmails();
