// source/services/emailService.js

const nodemailer = require('nodemailer');
const emailConfig = require('../config/emailConfig');

let transporter = null;

function isEmailConfigured() {
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER || emailConfig.GMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || emailConfig.GMAIL_APP_PASSWORD;
  return Boolean(user && pass);
}

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER || process.env.GMAIL_USER || emailConfig.GMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || emailConfig.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    const err = new Error('Email service not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const service = process.env.EMAIL_SERVICE || 'gmail';
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;

  transporter = nodemailer.createTransport({
    service,
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Verify connection configuration (logs only)
  transporter.verify((error) => {
    if (error) {
      console.log('❌ Email transporter error:', error?.message || error);
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });

  return transporter;
}

function buildOtpHtml(otp, purpose = 'login') {
  const year = new Date().getFullYear();
  let message = 'your otp for login is';
  if (purpose === 'forgot-password') message = 'your otp for password reset is';
  if (purpose === 'signup') message = 'your otp to verify your email for signup is';
  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
  <div style="max-width: 560px; margin: 0 auto; padding: 20px;">
    <h2 style="margin: 0 0 12px 0;">REALBTeams</h2>
    <p style="margin: 0 0 16px 0;">${message}</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 16px; border: 1px dashed #2b78ff; display: inline-block; border-radius: 8px;">
      ${otp}
    </div>
    <p style="margin: 16px 0 0 0; color: #555;">Valid for 10 minutes.</p>
    <p style="margin: 16px 0 0 0; color: #777; font-size: 12px;">© ${year} REALBTeams</p>
  </div>
</body>
</html>`;
}

async function sendLoginOtpEmail({ to, otp, purpose = 'login' }) {
  const subject = 'REALBTeams';
  let message = 'login';
  if (purpose === 'forgot-password') message = 'password reset';
  if (purpose === 'signup') message = 'email verification';
  const text = `REALBTeams\n\nyour otp for ${message} is ${otp}\n\nThis code expires in 10 minutes.`;

  const fromName = emailConfig.FROM_NAME || 'REALBTeams';
  const fromEmail = process.env.EMAIL_USER || process.env.GMAIL_USER || emailConfig.GMAIL_USER;

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    text,
    html: buildOtpHtml(otp, purpose),
  });

  return { success: true, messageId: info?.messageId };
}

module.exports = {
  sendLoginOtpEmail,
  isEmailConfigured,
};
