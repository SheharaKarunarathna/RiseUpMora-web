/**
 * scripts/test-send-emails.js
 *
 * Test script to send email body ONLY to sample recipients.
 * Does NOT query the database.
 *
 * Usage:
 *   node scripts/test-send-emails.js
 */

require("dotenv").config();
const nodemailer = require("nodemailer");

// Configured Sender Accounts
const ACCOUNTS = [
  {
    user: "riseupmora26@gmail.com",
    pass: "huza pnyo rhtr wxvp",
    name: "Sender 1",
  },
  {
    user: "riseupmora26i@gmail.com",
    pass: "ffdi wnom dcyj ryyp",
    name: "Sender 2",
  },
];

// Transporters for both accounts
const transporters = ACCOUNTS.map((acc) =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: acc.user,
      pass: acc.pass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  })
);

// SAMPLE RECIPIENTS ONLY
const SAMPLE_RECIPIENTS = [
  "kisajab72@gmail.com",
  "kalharajay@gmail.com",
  "kalharaj.23@cse.mrt.ac.lk",
];

const SUBJECT = "🚨 IMPORTANT NOTICE: RISE UP MORA 2026 🚨";

const HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Important Notice: Rise Up Mora 2026</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background-color: #f8fcfe; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,36,84,0.08); border: 1px solid rgba(0,36,84,0.1); }
    .header { background-color: #002454; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header h1 span { color: #f6c430; }
    .content { padding: 36px 32px; color: #333333; }
    .content h2 { color: #002454; margin-top: 0; font-size: 20px; font-weight: 800; text-align: center; }
    .content p { line-height: 1.6; margin-bottom: 20px; color: #4a5568; }
    .content ul { line-height: 1.6; margin-bottom: 24px; color: #4a5568; padding-left: 20px; }
    .content li { margin-bottom: 12px; }
    .footer { background-color: #f8fcfe; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid rgba(0,36,84,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rise Up <span>Mora</span></h1>
    </div>
    <div class="content">
      <h2>🚨 IMPORTANT NOTICE: RISE UP MORA 2026 🚨</h2>
      
      <p>Getting ready for the Internship &amp; Mock Interview Fair? Here is how the interview process works:</p>
      
      <ul>
        <li><strong>Pre-Registered Candidates</strong> (Priority)</li>
        <li><strong>Walk-In Interviews:</strong> Opened right after scheduled pre-booked slots finish, based on company availability.</li>
      </ul>

      <div style="background-color: #fefce8; border-left: 4px solid #f6c430; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; color: #744210; font-weight: 700; font-size: 15px;">
          Don't miss a walk-in chance! Join our official WhatsApp channel for live updates during the fair.
        </p>
      </div>
      
      <div style="text-align: center; margin: 28px 0;">
        <a href="https://chat.whatsapp.com/JI7ZuSvaig53nuIYcrV0kM?s=cl&p=a&ilr=1" style="background-color: #f6c430; color: #002454; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; display: inline-block; font-size: 16px;">Join WhatsApp Channel</a>
      </div>

      <p style="text-align: center; font-weight: 600; margin-bottom: 0;">See you all there ✨️</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Rise Up Mora. All rights reserved.
    </div>
  </div>
</body>
</html>`;

async function sendTestEmails() {
  console.log("=".repeat(70));
  console.log("  RiseUpMora — TEST Email Sender (Sample Recipients Only)");
  console.log("=".repeat(70));
  console.log(`  Recipients (${SAMPLE_RECIPIENTS.length}):`);
  SAMPLE_RECIPIENTS.forEach((email) => console.log(`   - ${email}`));
  console.log("=".repeat(70));

  let totalSuccess = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (let i = 0; i < SAMPLE_RECIPIENTS.length; i++) {
    const recipient = SAMPLE_RECIPIENTS[i];
    const transporterIdx = i % ACCOUNTS.length;
    const account = ACCOUNTS[transporterIdx];
    const transporter = transporters[transporterIdx];

    try {
      const info = await transporter.sendMail({
        from: `"Rise Up Mora" <${account.user}>`,
        to: recipient,
        subject: SUBJECT,
        html: HTML_TEMPLATE,
      });
      console.log(
        `[${i + 1}/${SAMPLE_RECIPIENTS.length}] 🚀 [${account.name}] Sent to: ${recipient} (Message ID: ${info.messageId})`
      );
      totalSuccess++;
    } catch (err) {
      console.error(
        `[${i + 1}/${SAMPLE_RECIPIENTS.length}] ❌ [${account.name}] Failed to send to ${recipient}: ${err.message}`
      );
      totalFailed++;
    }
  }

  transporters.forEach((t) => t.close());

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(70));
  console.log("  TEST EMAIL DISPATCH COMPLETE");
  console.log("=".repeat(70));
  console.log(`  Total Recipients : ${SAMPLE_RECIPIENTS.length}`);
  console.log(`  Successfully Sent: ${totalSuccess}`);
  console.log(`  Failed           : ${totalFailed}`);
  console.log(`  Time Elapsed     : ${durationSec} seconds`);
  console.log("=".repeat(70) + "\n");
}

sendTestEmails().catch(console.error);
