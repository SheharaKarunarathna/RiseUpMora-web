import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendInvitationEmail = async (to: string, token: string, role: string) => {
  const setupUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/setup-account?token=${token}`;
  
  // Format role for display
  const roleDisplay = role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rise Up Mora Invitation</title>
      <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fcfe; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,36,84,0.05); border: 1px solid rgba(0,36,84,0.1); }
        .header { background-color: #002454; padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header h1 span { color: #f6c430; }
        .content { padding: 40px 32px; color: #333333; }
        .content h2 { color: #002454; margin-top: 0; font-size: 20px; font-weight: 700; }
        .content p { line-height: 1.6; margin-bottom: 24px; color: #4a5568; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { background-color: #f6c430; color: #002454; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; display: inline-block; font-size: 16px; transition: transform 0.2s; }
        .footer { background-color: #f8fcfe; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid rgba(0,36,84,0.05); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Rise Up <span>Mora</span></h1>
        </div>
        <div class="content">
          <h2>Welcome to the Portal!</h2>
          <p>You have been invited to join the Rise Up Mora platform as a <strong>${roleDisplay}</strong>.</p>
          <p>To securely set up your account and choose your password, please click the button below. This link will expire in 7 days.</p>
          
          <div class="button-container">
            <a href="${setupUrl}" class="button">Setup My Account</a>
          </div>
          
          <p style="font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${setupUrl}" style="color: #33aeda; word-break: break-all;">${setupUrl}</a></p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Rise Up Mora. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Rise Up Mora" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Invitation: Join Rise Up Mora as a ${roleDisplay}`,
    html,
  });
};

export const sendCandidateVerificationEmail = async (
  to: string,
  token: string,
  name: string,
) => {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error("NEXTAUTH_URL is required to send candidate verification emails");
  }
  const setupUrl = `${baseUrl}/setup-account?token=${encodeURIComponent(token)}`;
  const safeName = name
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify your Rise Up Mora email</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f8fcfe; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,36,84,0.05); border: 1px solid rgba(0,36,84,0.1); }
        .header { background-color: #002454; padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; }
        .header h1 span { color: #f6c430; }
        .content { padding: 40px 32px; color: #333333; }
        .content h2 { color: #002454; margin-top: 0; font-size: 20px; }
        .content p { line-height: 1.6; margin-bottom: 24px; color: #4a5568; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { background-color: #f6c430; color: #002454; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; }
        .footer { background-color: #f8fcfe; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid rgba(0,36,84,0.05); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Rise Up <span>Mora</span></h1></div>
        <div class="content">
          <h2>Verify your email</h2>
          <p>Hello ${safeName},</p>
          <p>Thank you for registering as a candidate. Verify your email address and choose your password to activate your account. This link expires in 7 days.</p>
          <div class="button-container">
            <a href="${setupUrl}" class="button">Verify Email &amp; Set Password</a>
          </div>
          <p style="font-size: 14px;">If the button does not work, paste this link into your browser:<br>
          <a href="${setupUrl}" style="color: #1688b2; word-break: break-all;">${setupUrl}</a></p>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} Rise Up Mora. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Rise Up Mora" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your Rise Up Mora candidate account",
    html,
  });
};

export const sendCvNoticeEmail = async (to: string, name?: string) => {
  const safeName = name
    ? name
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
    : "Candidate";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rise Up Mora - Company Selection Notice</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f8fcfe; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,36,84,0.05); border: 1px solid rgba(0,36,84,0.1); }
        .header { background-color: #002454; padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; }
        .header h1 span { color: #f6c430; }
        .content { padding: 40px 32px; color: #333333; }
        .content h2 { color: #002454; margin-top: 0; font-size: 20px; }
        .content p { line-height: 1.6; margin-bottom: 20px; color: #4a5568; }
        .notice-box { background-color: #fefce8; border-left: 4px solid #f6c430; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px; }
        .notice-box p { margin: 0; color: #744210; font-weight: 600; }
        .footer { background-color: #f8fcfe; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid rgba(0,36,84,0.05); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Rise Up <span>Mora</span></h1></div>
        <div class="content">
          <h2>Company Selection Opening Soon</h2>
          <p>Hello ${safeName},</p>
          <div class="notice-box">
            <p>Company selection will open soon. Once company preferences are open for selection, you will be notified via email and through our website.</p>
          </div>
          <p>Please remember to check your spam or junk folder and mark our email address as 'not spam' to ensure you receive our updates. Alternatively, you may check our website regularly.</p>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} Rise Up Mora. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Rise Up Mora" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Company Selection Opening Soon - Rise Up Mora",
    html,
  });
};

export type ApplicationConfirmationDetails = {
  candidateName: string;
  candidateEmail: string;
  studentId: string;
  faculty: string;
  department: string;
  phone: string;
  cvUrl?: string | null;
  preferences: Array<{
    rank: number;
    companyName: string;
    slotNumber?: number | null;
  }>;
  comment?: string | null;
};

export const sendApplicationConfirmationEmail = async (
  to: string,
  details: ApplicationConfirmationDetails,
) => {
  const formatSlot = (slotNumber?: number | null) => {
    if (slotNumber === 1) return "Slot 1: 10:00 AM – 11:30 AM";
    if (slotNumber === 2) return "Slot 2: 11:45 AM – 1:00 PM";
    if (slotNumber === 3) return "Slot 3: 2:00 PM – 4:00 PM";
    return "No time slot selected";
  };

  const safe = (str?: string | null) =>
    str
      ? str
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;")
      : "N/A";

  const preferencesHtml =
    details.preferences.length > 0
      ? details.preferences
          .map(
            (p) => `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fcfe; border: 1px solid rgba(0,36,84,0.08); border-radius: 12px; margin-bottom: 10px; border-collapse: separate; padding: 12px 16px;">
              <tr>
                <td style="font-weight: 800; color: #002454; font-size: 15px; vertical-align: middle;">
                  <strong style="color: #33aeda; margin-right: 8px;">#${p.rank}</strong> ${safe(p.companyName)}
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  ${
                    p.rank === 1 || p.rank === 2
                      ? `<span style="background: rgba(51,174,218,0.12); color: #1688b2; font-weight: 700; font-size: 12px; padding: 6px 12px; border-radius: 8px; display: inline-block;">
                          ${formatSlot(p.slotNumber)}
                         </span>`
                      : `<span style="color: #718096; font-size: 12px; font-style: italic;">No time slot required</span>`
                  }
                </td>
              </tr>
            </table>
          `,
          )
          .join("")
      : `<p style="color: #718096; font-style: italic;">No company preferences selected.</p>`;

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.riseupmora.lk";
  const cvMeUrl = `${baseUrl}/api/v1/candidate/cv/me`;

  const cvLinkHtml = details.cvUrl
    ? `<div style="text-align: center; margin: 24px 0;">
        <a href="${cvMeUrl}" target="_blank" style="background-color: #33aeda; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; display: inline-block; font-size: 14px;">
          📄 View Submitted CV
        </a>
       </div>`
    : `<p style="color: #e53e3e; font-size: 13px; text-align: center;">No CV file uploaded.</p>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Application Confirmation - Rise Up Mora</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f8fcfe; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,36,84,0.08); border: 1px solid rgba(0,36,84,0.1); }
        .header { background-color: #002454; padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header h1 span { color: #f6c430; }
        .content { padding: 36px 32px; color: #333333; }
        .content h2 { color: #002454; margin-top: 0; font-size: 20px; font-weight: 800; }
        .footer { background-color: #f8fcfe; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid rgba(0,36,84,0.05); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Rise Up <span>Mora</span></h1>
        </div>
        <div class="content">
          <h2>Application Confirmation</h2>
          <p style="color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
            Hello <strong>${safe(details.candidateName)}</strong>,<br>
            Your application for Rise Up Mora has been successfully received/updated. Below are the details of your submission:
          </p>

          <h3 style="color: #002454; font-size: 14px; font-weight: 800; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Candidate Profile</h3>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fcfe; border: 1px solid rgba(0,36,84,0.08); border-radius: 12px; margin-bottom: 24px; border-collapse: separate; padding: 12px 18px;">
            <tr>
              <td style="padding: 8px 0; color: #718096; font-weight: 600; font-size: 14px; border-bottom: 1px solid rgba(0,36,84,0.05);">Full Name</td>
              <td style="padding: 8px 0; color: #002454; font-weight: 700; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(0,36,84,0.05);">${safe(details.candidateName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-weight: 600; font-size: 14px; border-bottom: 1px solid rgba(0,36,84,0.05);">Email Address</td>
              <td style="padding: 8px 0; color: #002454; font-weight: 700; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(0,36,84,0.05);">${safe(details.candidateEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-weight: 600; font-size: 14px; border-bottom: 1px solid rgba(0,36,84,0.05);">Student ID</td>
              <td style="padding: 8px 0; color: #002454; font-weight: 700; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(0,36,84,0.05);">${safe(details.studentId)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-weight: 600; font-size: 14px; border-bottom: 1px solid rgba(0,36,84,0.05);">Faculty</td>
              <td style="padding: 8px 0; color: #002454; font-weight: 700; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(0,36,84,0.05);">${safe(details.faculty)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-weight: 600; font-size: 14px; border-bottom: 1px solid rgba(0,36,84,0.05);">Department</td>
              <td style="padding: 8px 0; color: #002454; font-weight: 700; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(0,36,84,0.05);">${safe(details.department)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-weight: 600; font-size: 14px;">Contact Number</td>
              <td style="padding: 8px 0; color: #002454; font-weight: 700; font-size: 14px; text-align: right;">${safe(details.phone)}</td>
            </tr>
          </table>

          ${cvLinkHtml}

          <h3 style="color: #002454; font-size: 14px; font-weight: 800; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Company Preferences &amp; Time Slots</h3>
          ${preferencesHtml}

          ${
            details.comment
              ? `<div style="margin-top: 20px;">
                  <h3 style="color: #002454; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Additional Comment</h3>
                  <p style="background: #f8fcfe; padding: 12px; border-radius: 8px; border: 1px solid rgba(0,36,84,0.08); font-size: 13px; color: #4a5568; margin-top: 6px;">${safe(details.comment)}</p>
                 </div>`
              : ""
          }

          <div style="background-color: #fefce8; border-left: 4px solid #f6c430; padding: 14px 18px; border-radius: 8px; margin-top: 24px;">
            <p style="margin: 0; color: #744210; font-size: 13px; font-weight: 600; line-height: 1.5;">
              <strong>Time Slot Disclaimer:</strong> The time slot you selected is treated as a preference. The organizing committee reserves the right to adjust time slots based on scheduling logistics and company availability.
            </p>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Rise Up Mora. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Rise Up Mora" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Application Confirmation - Rise Up Mora",
    html,
  });
};

