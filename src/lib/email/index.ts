import "server-only";

interface SendPasswordResetEmailOptions {
  to: string;
  resetUrl: string;
  userName?: string | null;
}

/**
 * Clean email dispatch abstraction.
 * In production, connects to transactional email API when configured;
 * in development, safely logs email payload for testing.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: SendPasswordResetEmailOptions): Promise<{ success: boolean }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "security@superwarrior30.com";

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: "Reset your Super Warrior 30 password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #0f172a;">Password Reset Request</h2>
              <p>Hello ${userName || "Trader"},</p>
              <p>We received a request to reset your password for your Super Warrior 30 account.</p>
              <p>Click the link below to set a new password. This link will expire in 1 hour:</p>
              <p style="margin: 25px 0;">
                <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </p>
              <p style="color: #64748b; font-size: 13px;">If you did not make this request, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        console.error("Resend API error:", await response.text());
        return { success: false };
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to send reset email via Resend:", err);
      return { success: false };
    }
  }

  // Safe development fallback: log reset link to console for testing
  console.log("=========================================");
  console.log(`[PASSWORD RESET EMAIL] To: ${to}`);
  console.log(`[PASSWORD RESET LINK] ${resetUrl}`);
  console.log("=========================================");

  return { success: true };
}
