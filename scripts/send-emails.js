/**
 * scripts/send-emails.js
 *
 * Fast Dual-Account Parallel Bulk Email Sender for Rise Up Mora.
 * Uses 2 sender accounts simultaneously:
 *   - 5 emails sent via Sender Account 1
 *   - 5 emails sent via Sender Account 2
 *   = Total 10 emails sent concurrently per batch.
 *
 * Environment Variables (.env):
 *   EMAIL_USER_1 / EMAIL_PASS_1 (or default EMAIL_USER / EMAIL_PASS)
 *   EMAIL_USER_2 / EMAIL_PASS_2
 *
 * Usage:
 *   node scripts/send-emails.js
 */

require("dotenv").config();
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

// Configured Sender Accounts (loaded from .env)
const ACCOUNTS = [
  {
    user: process.env.EMAIL_USER_1 || process.env.EMAIL_USER || "capriqorn.rx4@gmail.com",
    pass: process.env.EMAIL_PASS_1 || process.env.EMAIL_PASS || "hfyo xvoe rjem ktpx",
    name: "Sender 1",
  },
  {
    user: process.env.EMAIL_USER_2 || process.env.EMAIL_USER || "capriqorn.rx4@gmail.com",
    pass: process.env.EMAIL_PASS_2 || process.env.EMAIL_PASS || "hfyo xvoe rjem ktpx",
    name: "Sender 2",
  },
];

// Create Nodemailer transporters for both accounts
const transporters = ACCOUNTS.map((acc) =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: acc.user,
      pass: acc.pass,
    },
    // Pool connections for maximum throughput
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  })
);

// Fallback recipient list (overridden if querying from DB)
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a single email using a specific account transporter.
 */
async function sendSingleEmail(transporterIdx, recipient, index, total) {
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
      `[${index + 1}/${total}] 🚀 [${account.name} (${account.user})] Sent to: ${recipient} (ID: ${info.messageId})`
    );
    return { success: true, recipient };
  } catch (err) {
    console.error(
      `[${index + 1}/${total}] ❌ [${account.name} (${account.user})] Failed to send to ${recipient}: ${err.message}`
    );
    return { success: false, recipient, error: err.message };
  }
}

/**
 * Main function: fetches recipients and sends 10 at a time (5 via Account 1 + 5 via Account 2)
 */
async function sendBulkEmails() {
  console.log("=".repeat(70));
  console.log("  RiseUpMora — High-Speed Dual-Account Email Sender");
  console.log("=".repeat(70));
  console.log(`  Account 1 : ${ACCOUNTS[0].user}`);
  console.log(`  Account 2 : ${ACCOUNTS[1].user}`);
  console.log(`  Batching  : 5 (Account 1) + 5 (Account 2) = 10 parallel emails / batch`);
  console.log("=".repeat(70));

  let recipients = [...SAMPLE_RECIPIENTS];

  const isTestMode = process.argv.includes("--test") || process.argv.includes("--sample") || process.env.TEST_MODE === "true";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

  if (isTestMode) {
    console.log("\n🧪 RUNNING IN TEST MODE: Using sample recipients list.\n");
  } else if (process.env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      });
      const { rows } = await pool.query(
        "SELECT DISTINCT email FROM users WHERE role = 'candidate' AND email IS NOT NULL AND email != ''"
      );
      if (rows.length > 0) {
        recipients = rows.map((r) => r.email.trim());
        console.log(`\n📋 Loaded ${recipients.length} candidate recipient email(s) from database.\n`);
      }
      await pool.end();
    } catch (err) {
      console.log(`\n⚠️  Database query skipped (${err.message}). Using sample recipient list.\n`);
    }
  }

  if (limit && !isNaN(limit)) {
    recipients = recipients.slice(0, limit);
    console.log(`⏱️  Limit applied: sending to first ${recipients.length} recipient(s).\n`);
  }

  let totalSuccess = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  const BATCH_SIZE = 10;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    
    // Split batch into 5 + 5
    const group1 = chunk.slice(0, 5); // Sent via Account 1
    const group2 = chunk.slice(5, 10); // Sent via Account 2

    console.log(`\n📦 Processing Batch [${i + 1} - ${Math.min(i + BATCH_SIZE, recipients.length)} / ${recipients.length}]...`);

    // Prepare 5 promises for Account 1 and 5 promises for Account 2
    const promisesGroup1 = group1.map((rec, idx) =>
      sendSingleEmail(0, rec, i + idx, recipients.length)
    );

    const promisesGroup2 = group2.map((rec, idx) =>
      sendSingleEmail(1, rec, i + 5 + idx, recipients.length)
    );

    // Run all 10 parallel email dispatches simultaneously
    const results = await Promise.all([...promisesGroup1, ...promisesGroup2]);

    results.forEach((res) => {
      if (res.success) totalSuccess++;
      else totalFailed++;
    });

    // Small 500ms delay between batches to respect SMTP connection limits
    if (i + BATCH_SIZE < recipients.length) {
      await sleep(500);
    }
  }

  // Close SMTP pools
  transporters.forEach((t) => t.close());

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(70));
  console.log("  BULK EMAIL SENDING COMPLETE");
  console.log("=".repeat(70));
  console.log(`  Total Recipients : ${recipients.length}`);
  console.log(`  Successfully Sent: ${totalSuccess}`);
  console.log(`  Failed           : ${totalFailed}`);
  console.log(`  Time Elapsed     : ${durationSec} seconds`);
  console.log("=".repeat(70) + "\n");
}

sendBulkEmails().catch(console.error);
