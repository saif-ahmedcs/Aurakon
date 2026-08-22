const nodemailer = require("nodemailer");

let cachedTransporter;

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Missing Gmail SMTP environment variables.");
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return cachedTransporter;
}

function htmlToFallbackText(html) {
  return html
    .replace(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi,
      (_, href) => ` ${href} `,
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sendEmail({
  to,
  subject,
  html,
  text,
  eventName,
  correlationId,
}) {
  try {
    const transporter = getTransporter();
    const fallbackText = htmlToFallbackText(html);

    const info = await transporter.sendMail({
      from: `"Aurakon" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || fallbackText,
    });

    if (info.rejected && info.rejected.length > 0) {
      throw new Error("Email rejected by provider.");
    }

    console.log(
      `[emailService] accepted=${info.accepted.length} rejected=${info.rejected.length} response=${info.response}`,
    );
    return info;
  } catch (err) {
    const eventLabel = eventName || "unknown";
    const correlationLabel = correlationId || "unknown";
    console.error(
      `[emailService] Failed to send email event=${eventLabel} correlationId=${correlationLabel}: ${err.message}`,
    );
    throw err;
  }
}

module.exports = { sendEmail };
