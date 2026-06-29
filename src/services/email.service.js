import { Resend } from "resend";

let _resend = null;
const getResend = () => {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

const getFromEmail = () => process.env.FROM_EMAIL || "NForce Pulse <onboarding@resend.dev>";

export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    throw new Error("Email service is not configured. Set RESEND_API_KEY in environment variables.");
  }

  if (!to || !subject || !html) {
    throw new Error("Missing required fields: to, subject, html");
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend send error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Email sent successfully via Resend. ID:", data?.id);
    return { success: true, messageId: data?.id };
  } catch (err) {
    if (err.message.startsWith("Failed to send email") || err.message.startsWith("Email service is not configured") || err.message.startsWith("Missing required fields")) {
      throw err;
    }
    console.error("Unexpected email error:", err);
    throw new Error("Failed to send email. Please try again later.");
  }
};

export const sendResetEmail = async ({ email, resetLink, userName }) => {
  const greeting = userName ? `Hello ${userName},` : "Hello,";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your NForce Pulse Password</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 0 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.5px;">NForce Pulse</h1>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 40px 0 40px;">
              <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:24px;">${greeting}</p>
              <p style="margin:0 0 20px 0;font-size:16px;color:#374151;line-height:24px;">
                We received a request to reset the password associated with your NForce Pulse account. Click the button below to reset your password.
              </p>

              <!-- Reset Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="background-color:#E30613;background:linear-gradient(135deg,#FF2D2D,#E30613);border-radius:12px;box-shadow:0 6px 18px rgba(255,0,0,0.25);">
                    <a href="${resetLink}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:#E30613;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <p style="margin:0 0 8px 0;font-size:14px;color:#6B7280;line-height:20px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;color:#DC2626;line-height:20px;word-break:break-all;">
                <a href="${resetLink}" style="color:#DC2626;">${resetLink}</a>
              </p>

              <!-- Expiry Info -->
              <p style="margin:0 0 24px 0;font-size:14px;color:#9CA3AF;line-height:20px;">
                This link will expire in <strong style="color:#6B7280;">1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
              </p>

              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 24px 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 40px 40px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#9CA3AF;">
                NForce Pulse &mdash; Enterprise Time Tracking
              </p>
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                If you didn't request this email, no further action is required.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: "Reset Your NForce Pulse Password",
    html,
  });
};
