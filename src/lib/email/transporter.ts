import "server-only";
import nodemailer from "nodemailer";

/**
 * Namecheap Private Email SMTP Configuration
 * Host: mail.privateemail.com
 * Port: 465 (SSL/TLS)
 * User: noreply@superwarrior30.com
 */
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "mail.privateemail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE !== "false", // true for 465 SSL/TLS
  user: process.env.SMTP_USER || "noreply@superwarrior30.com",
  fromName: process.env.SMTP_FROM_NAME || "Rahul Trade Warrior Academy",
  fromEmail: process.env.SMTP_FROM_EMAIL || "noreply@superwarrior30.com",
};

export function getSmtpPassword(): string {
  return (
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_SERVER_PASSWORD ||
    ""
  );
}

let transporterInstance: nodemailer.Transporter | null = null;

export function getMailTransporter(): nodemailer.Transporter {
  if (!transporterInstance) {
    const password = getSmtpPassword();

    transporterInstance = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: {
        user: SMTP_CONFIG.user,
        pass: password,
      },
      tls: {
        rejectUnauthorized: true,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  return transporterInstance;
}

/**
 * Verify Namecheap SMTP connection without revealing credentials.
 */
export async function verifySmtpConnection(): Promise<{
  connected: boolean;
  host: string;
  port: number;
  user: string;
  hasPassword: boolean;
  error?: string;
}> {
  const hasPassword = Boolean(getSmtpPassword());

  if (!hasPassword) {
    return {
      connected: false,
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      user: SMTP_CONFIG.user,
      hasPassword: false,
      error: "SMTP_PASSWORD environment variable is not configured on this server.",
    };
  }

  try {
    const transporter = getMailTransporter();
    await transporter.verify();
    return {
      connected: true,
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      user: SMTP_CONFIG.user,
      hasPassword: true,
    };
  } catch (err: any) {
    const errorMessage = err?.message || "Failed to establish SMTP connection.";
    return {
      connected: false,
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      user: SMTP_CONFIG.user,
      hasPassword: true,
      error: errorMessage,
    };
  }
}
