import "server-only";
import { getMailTransporter, getSmtpPassword, SMTP_CONFIG } from "./transporter";

export { verifySmtpConnection, SMTP_CONFIG } from "./transporter";

interface BaseEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Core dispatch function routing all LMS outbound emails through Namecheap Private Email.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: BaseEmailOptions): Promise<{ success: boolean; error?: string }> {
  const password = getSmtpPassword();
  const cleanTo = to.toLowerCase().trim();

  // If SMTP password is not set in development, log safely to console for local testing
  if (!password) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `\n[EMAIL NOTICE - DEV MODE]\nSMTP_PASSWORD not configured in environment.\nDestination: ${cleanTo}\nSubject: ${subject}\nText:\n${text}\n`
      );
      return { success: true };
    }

    console.error(`[SMTP ERROR] Cannot send email to ${cleanTo}: SMTP_PASSWORD is not configured.`);
    return {
      success: false,
      error: "SMTP configuration is incomplete on this server.",
    };
  }

  try {
    const transporter = getMailTransporter();
    await transporter.sendMail({
      from: `"${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.fromEmail}>`,
      to: cleanTo,
      subject,
      text,
      html,
    });

    return { success: true };
  } catch (err: any) {
    // Log technical error safely without exposing credentials or OTP content
    console.error(`[SMTP DELIVERY FAILURE] Error sending email to ${cleanTo}:`, err?.message || err);
    return {
      success: false,
      error: "We could not send the email message. Please try again later.",
    };
  }
}

/**
 * Standard branded HTML email template wrapper.
 */
function renderBrandedTemplate({
  title,
  preheader,
  contentHtml,
  footerNote,
}: {
  title: string;
  preheader?: string;
  contentHtml: string;
  footerNote?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0e14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #121722;
      border: 1px solid #232d3f;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #18202f 0%, #111622 100%);
      padding: 28px 24px;
      text-align: center;
      border-bottom: 1px solid #232d3f;
    }
    .brand-badge {
      display: inline-block;
      background-color: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #f59e0b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 20px;
      margin-bottom: 10px;
    }
    .brand-title {
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .content {
      padding: 32px 28px;
    }
    .otp-box {
      background: linear-gradient(180deg, #1a2232 0%, #151b27 100%);
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #f59e0b;
      margin: 0;
    }
    .warning-box {
      background-color: rgba(239, 68, 68, 0.08);
      border-left: 3px solid #ef4444;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 20px 0;
      font-size: 12px;
      color: #fca5a5;
      line-height: 1.5;
    }
    .footer {
      background-color: #0d111a;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #1e2638;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer a {
      color: #f59e0b;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#0b0e14;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
  <div class="email-container">
    <div class="header">
      <div class="brand-badge">Rahul Trade Warrior</div>
      <h1 class="brand-title">Trade Warrior Academy</h1>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">This is an automated security transmission from Rahul Trade Warrior Academy.</p>
      ${footerNote ? `<p style="margin: 0 0 8px 0;">${footerNote}</p>` : ""}
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Rahul Trade Warrior Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send Login OTP Email
 */
export async function sendLoginOtpEmail({
  to,
  name,
  otp,
  expirationMinutes = 5,
}: {
  to: string;
  name?: string | null;
  otp: string;
  expirationMinutes?: number;
}): Promise<{ success: boolean; error?: string }> {
  const greetingName = name?.trim() ? name.trim() : "Trader";
  const subject = `${otp} is your Rahul Trade Warrior login verification code`;
  const preheader = `Your 6-digit login verification code is ${otp}. Valid for ${expirationMinutes} minutes.`;

  const html = renderBrandedTemplate({
    title: "Login Verification Code",
    preheader,
    contentHtml: `
      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">Login Verification</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
        Hello <strong>${greetingName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
        We received a request to sign in to your Rahul Trade Warrior account. Use the 6-digit verification code below to complete your login:
      </p>

      <div class="otp-box">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin: 0 0 8px 0;">Verification Code</p>
        <div class="otp-code">${otp}</div>
        <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0 0;">Expires in ${expirationMinutes} minutes</p>
      </div>

      <div class="warning-box">
        <strong>Security Notice:</strong> Never share this code with anyone. Rahul Trade Warrior instructors and support staff will never ask for your verification code or password.
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 20px 0 0 0;">
        If you did not attempt to log in to your account, please ignore this email or change your account password immediately.
      </p>
    `,
  });

  const text = `
Rahul Trade Warrior Academy - Login Verification Code

Hello ${greetingName},

Your 6-digit login verification code is: ${otp}

This code will expire in ${expirationMinutes} minutes.

Security Notice: Never share this code with anyone. Our team will never ask for your code.
If you did not request this login code, please secure your account immediately.
  `.trim();

  return sendEmail({ to, subject, html, text });
}

/**
 * Send Email Verification OTP Email
 */
export async function sendEmailVerificationOtp({
  to,
  name,
  otp,
  expirationMinutes = 5,
}: {
  to: string;
  name?: string | null;
  otp: string;
  expirationMinutes?: number;
}): Promise<{ success: boolean; error?: string }> {
  const greetingName = name?.trim() ? name.trim() : "Trader";
  const subject = `${otp} is your email verification code`;

  const html = renderBrandedTemplate({
    title: "Email Verification Code",
    contentHtml: `
      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">Verify Your Email Address</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
        Hello <strong>${greetingName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
        Thank you for joining Rahul Trade Warrior Academy. Use the verification code below to verify your email address:
      </p>

      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0 0;">Expires in ${expirationMinutes} minutes</p>
      </div>
    `,
  });

  const text = `Rahul Trade Warrior - Email Verification Code: ${otp} (Expires in ${expirationMinutes} minutes)`;
  return sendEmail({ to, subject, html, text });
}

/**
 * Send Password Reset Email (Legacy URL link & OTP compatible)
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: {
  to: string;
  resetUrl: string;
  userName?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const greetingName = userName?.trim() ? userName.trim() : "Trader";
  const subject = "Reset your Rahul Trade Warrior password";

  const html = renderBrandedTemplate({
    title: "Password Reset Request",
    contentHtml: `
      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">Password Reset Request</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
        Hello <strong>${greetingName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
        We received a request to reset your password for Rahul Trade Warrior Academy. Click the button below to choose a new password:
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="background-color: #f59e0b; color: #000000; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 14px; display: inline-block;">
          Reset My Password
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
        This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.
      </p>
    `,
  });

  const text = `
Rahul Trade Warrior Academy - Password Reset

Hello ${greetingName},

Click the link below to reset your account password:
${resetUrl}

This link is valid for 1 hour. If you did not request this, please ignore this email.
  `.trim();

  return sendEmail({ to, subject, html, text });
}

/**
 * Send Generic Transactional Email
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
}: BaseEmailOptions): Promise<{ success: boolean; error?: string }> {
  return sendEmail({ to, subject, html, text });
}

/**
 * Send Live Test Email to verify SMTP configuration
 */
export async function sendTestEmail({
  to,
}: {
  to: string;
}): Promise<{ success: boolean; error?: string }> {
  const subject = "Rahul Trade Warrior SMTP Delivery Test";
  const html = renderBrandedTemplate({
    title: "SMTP Connection Test",
    contentHtml: `
      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">SMTP Test Successful!</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
        This email confirms that your <strong>Namecheap Private Email</strong> SMTP connection is working perfectly.
      </p>
      <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 12px; color: #34d399;">
        <strong>Configuration Details:</strong><br>
        • Host: ${SMTP_CONFIG.host}<br>
        • Port: ${SMTP_CONFIG.port} (SSL/TLS)<br>
        • Sender: ${SMTP_CONFIG.fromEmail}<br>
        • Timestamp: ${new Date().toUTCString()}
      </div>
    `,
  });

  const text = `Rahul Trade Warrior SMTP test delivered successfully to ${to} via ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}.`;
  return sendEmail({ to, subject, html, text });
}
