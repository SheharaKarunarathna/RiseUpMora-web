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
      <title>Rise Up Mora - CV Submission Notice</title>
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
          <h2>CV Submissions Opening Soon</h2>
          <p>Hello ${safeName},</p>
          <div class="notice-box">
            <p>The CV submission period will open by the end of July. Once submissions begin, you will be notified via email and through our website.</p>
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
    subject: "CV Submissions Opening Soon - Rise Up Mora",
    html,
  });
};

