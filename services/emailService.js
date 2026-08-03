const nodemailer = require("nodemailer");

function enqueueRetryableEmailFailure(eventName, correlationId, error) {
  console.error(
    `[emailService] retryable_queue event=${eventName} correlationId=${correlationId} error=${error.message}`,
  );
}

let transporter;

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Missing Gmail SMTP environment variables.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return transporter;
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
    const fallbackText = html
      .replace(
        /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi,
        (_, href) => ` ${href} `,
      )
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const info = await transporter.sendMail({
      from: `"Aurakon" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || fallbackText,
    });

    if (info.rejected && info.rejected.length > 0) {
      const error = new Error("Email rejected by provider.");
      throw error;
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
    enqueueRetryableEmailFailure(eventLabel, correlationLabel, err);
    throw err;
  }
}

module.exports = { sendEmail };
