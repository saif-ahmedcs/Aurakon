const nodemailer = require("nodemailer");

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  throw new Error("Missing Gmail SMTP environment variables.");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"Aurakon" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text:
        text ||
        html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
    });
    console.log(
      `[emailService] accepted=${info.accepted.length} rejected=${info.rejected.length} response=${info.response}`,
    );
    return info;
  } catch (err) {
    console.error("[emailService] Failed to send email:", err.message);
    return null;
  }
}

module.exports = { sendEmail };
