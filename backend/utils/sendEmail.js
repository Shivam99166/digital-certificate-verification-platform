const nodemailer = require("nodemailer");

/**
 * Sends an email using SMTP credentials from environment variables.
 *
 * Required env vars:
 *   EMAIL_HOST   — SMTP host        (e.g. smtp.gmail.com)
 *   EMAIL_PORT   — SMTP port        (e.g. 587)
 *   EMAIL_USER   — sender address   (e.g. noreply@certvault.app)
 *   EMAIL_PASS   — SMTP password / app password
 *
 * Optional:
 *   EMAIL_FROM   — display name     (default: "CertVault <EMAIL_USER>")
 *
 * @param {object} options
 * @param {string} options.to        Recipient email address
 * @param {string} options.subject   Email subject line
 * @param {string} options.html      HTML body
 * @param {string} [options.text]    Plain-text fallback body
 * @param {Array}  [options.attachments] Optional nodemailer attachments
 * @returns {Promise<{ sent: boolean, dev?: boolean, messageId?: string }>}
 */
const sendEmail = async ({ to, subject, html, text, attachments }) => {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM,
  } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    // In development without SMTP config, log to console instead of throwing
    if (process.env.NODE_ENV !== "production") {
      console.log("\n══════════════════════════════════════════════════");
      console.log("📧 [DEV] Email not sent — SMTP not configured");
      console.log(`   To:      ${to}`);
      console.log(`   Subject: ${subject}`);
      if (text) console.log(`   Text:    ${text.slice(0, 120)}...`);
      console.log("══════════════════════════════════════════════════\n");
      return { sent: false, dev: true };
    }
    throw new Error("Email service is not configured. Please contact support.");
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT, 10) || 587,
    // Use STARTTLS on port 587 (secure: false), TLS on port 465 (secure: true)
    secure: parseInt(EMAIL_PORT, 10) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  const from = EMAIL_FROM || `CertVault <${EMAIL_USER}>`;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: text || "Please view this email in an HTML-capable client.",
    html,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
  });

  return { sent: true, messageId: info.messageId };
};

module.exports = sendEmail;
