function baseEmailWrapper({
  title,
  subtitle,
  bodyHtml,
  actionButton,
  secondaryNotice,
  fallbackLink,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #05040a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-spacing: 0;
    }
    td {
      padding: 0;
    }
    img {
      border: 0;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #05040a;
      padding-bottom: 40px;
    }
    .main-card {
      background-color: #0e091e;
      margin: 0 auto;
      width: 100%;
      max-width: 540px;
      border: 1px solid rgba(168, 85, 247, 0.32);
      border-radius: 18px;
      box-shadow: 0 12px 40px rgba(124, 58, 237, 0.25);
      overflow: hidden;
    }
    .btn-aura {
      display: inline-block;
      padding: 14px 32px;
      background-color: #7c3aed;
      background-image: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 12px;
      letter-spacing: 0.02em;
      box-shadow: 0 4px 20px rgba(124, 58, 237, 0.45);
    }
    @media only screen and (max-width: 600px) {
      .main-card {
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .content-padding {
        padding: 28px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #05040a;">
  <center class="wrapper" style="width: 100%; table-layout: fixed; background-color: #05040a; padding-top: 32px; padding-bottom: 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding: 12px;">
          <!-- MAIN CARD -->
          <table class="main-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #0e091e; border: 1px solid rgba(168, 85, 247, 0.32); border-radius: 18px; box-shadow: 0 12px 40px rgba(124, 58, 237, 0.25);">
            
            <!-- HEADER -->
            <tr>
              <td align="center" style="padding: 34px 28px 16px; border-bottom: 1px solid rgba(168, 85, 247, 0.15);">
                <div style="font-size: 26px; font-weight: 800; letter-spacing: 0.12em; color: #ffffff; text-transform: uppercase;">
                  <span style="color: #c084fc;">AURA</span>KON
                </div>
                <div style="font-size: 12px; color: #a78bfa; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px; font-weight: 500;">
                  Master Your Habits • Awaken Your Aura
                </div>
              </td>
            </tr>

            <!-- CONTENT BODY -->
            <tr>
              <td class="content-padding" style="padding: 36px 34px 28px;">
                <!-- TITLE -->
                <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.35; text-align: center;">
                  ${title}
                </h1>

                ${
                  subtitle
                    ? `<p style="margin: 0 0 24px; font-size: 14px; color: #c4b5fd; text-align: center; line-height: 1.5;">${subtitle}</p>`
                    : ""
                }

                <!-- BODY TEXT -->
                <div style="font-size: 14px; line-height: 1.7; color: #d1d5db; margin-bottom: 28px;">
                  ${bodyHtml}
                </div>

                <!-- ACTION BUTTON -->
                ${
                  actionButton
                    ? `
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                  <tr>
                    <td align="center">
                      <a href="${actionButton.url}" target="_blank" rel="noopener noreferrer" class="btn-aura" style="display: inline-block; padding: 14px 34px; background-color: #7c3aed; background-image: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 12px; letter-spacing: 0.02em; box-shadow: 0 4px 20px rgba(124, 58, 237, 0.45);">
                        ${actionButton.label}
                      </a>
                    </td>
                  </tr>
                </table>
                `
                    : ""
                }

                <!-- SECONDARY NOTICE (EXPIRATION / SECURITY) -->
                ${
                  secondaryNotice
                    ? `
                <div style="background-color: rgba(124, 58, 237, 0.08); border-left: 3px solid #a855f7; border-radius: 6px; padding: 12px 14px; margin-bottom: 24px; font-size: 13px; color: #c4b5fd; line-height: 1.5;">
                  ${secondaryNotice}
                </div>
                `
                    : ""
                }

                <!-- FALLBACK LINK -->
                ${
                  fallbackLink
                    ? `
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 18px; margin-top: 20px;">
                  <p style="margin: 0 0 6px; font-size: 12px; color: #9ca3af;">
                    Button not working? Copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0; font-size: 12px; word-break: break-all;">
                    <a href="${fallbackLink}" target="_blank" rel="noopener noreferrer" style="color: #a855f7; text-decoration: underline;">
                      ${fallbackLink}
                    </a>
                  </p>
                </div>
                `
                    : ""
                }
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="padding: 20px 34px 28px; background-color: rgba(5, 4, 10, 0.5); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; line-height: 1.5;">
                  If you didn't create an account or request this action, you can safely ignore this email.
                </p>
                <p style="margin: 0; font-size: 11px; color: #4b5563; letter-spacing: 0.04em;">
                  &copy; Aurakon Inc. • Protected by Aurakon Security Systems
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

function getVerificationEmailHtml(appBaseUrl, rawToken, isResend = false) {
  const verifyUrl = `${appBaseUrl}/verify-email?token=${rawToken}`;
  const title = isResend ? "Your Verification Link" : "Awaken Your Aura";
  const subtitle = isResend
    ? "Here is your requested confirmation link"
    : "Confirm your account to begin your journey";

  const bodyHtml = `
    <p style="margin: 0 0 12px;">Greetings, Warrior.</p>
    <p style="margin: 0 0 12px;">
      ${
        isResend
          ? "You requested a new verification link for your Aurakon account."
          : "Welcome to Aurakon. Your journey to self-mastery and daily discipline is about to begin."
      }
    </p>
    <p style="margin: 0;">
      Click the button below to confirm your email address and awaken your Aura.
    </p>
  `;

  return baseEmailWrapper({
    title,
    subtitle,
    bodyHtml,
    actionButton: {
      label: "Confirm My Account",
      url: verifyUrl,
    },
    secondaryNotice:
      "⏳ <strong>Notice:</strong> This verification link is valid for 24 hours.",
    fallbackLink: verifyUrl,
  });
}

function getPasswordResetEmailHtml(appBaseUrl, rawToken) {
  const resetUrl = `${appBaseUrl}/reset-password?token=${rawToken}`;
  const title = "Restore Your Strength";
  const subtitle = "Password reset request received";

  const bodyHtml = `
    <p style="margin: 0 0 12px;">Greetings, Warrior.</p>
    <p style="margin: 0 0 12px;">
      Even the strongest warriors lose their way. We received a request to reset the password for your Aurakon account.
    </p>
    <p style="margin: 0;">
      Click the button below to choose a new password and restore your path.
    </p>
  `;

  return baseEmailWrapper({
    title,
    subtitle,
    bodyHtml,
    actionButton: {
      label: "Reset My Password",
      url: resetUrl,
    },
    secondaryNotice:
      "⏳ <strong>Security Notice:</strong> This link is valid for <strong>1 hour</strong>. If you did not make this request, your account remains secure and no action is required.",
    fallbackLink: resetUrl,
  });
}

function getEmailChangeEmailHtml(appBaseUrl, rawToken) {
  const confirmUrl = `${appBaseUrl}/confirm-email-change?token=${rawToken}`;
  const title = "Confirm Your New Email";
  const subtitle = "Email address update verification";

  const bodyHtml = `
    <p style="margin: 0 0 12px;">Greetings, Warrior.</p>
    <p style="margin: 0 0 12px;">
      You requested to link this email address to your Aurakon account.
    </p>
    <p style="margin: 0;">
      Click the button below to verify and complete the email change.
    </p>
  `;

  return baseEmailWrapper({
    title,
    subtitle,
    bodyHtml,
    actionButton: {
      label: "Confirm New Email",
      url: confirmUrl,
    },
    secondaryNotice: "⏳ This confirmation link is valid for 1 hour.",
    fallbackLink: confirmUrl,
  });
}

function getAccountDeletionEmailHtml(appBaseUrl, rawToken) {
  const confirmUrl = `${appBaseUrl}/confirm-account-deletion?token=${rawToken}`;
  const title = "Aurakon Account Deletion Request";
  const subtitle = "Confirm your account closure";

  const bodyHtml = `
    <p style="margin: 0 0 12px;">Greetings,</p>
    <p style="margin: 0 0 12px;">
      We received a request to close your Aurakon account. Confirming will remove your streaks, XP, and progression.
    </p>
    <p style="margin: 0;">
      If you'd like to proceed, click the button below to confirm.
    </p>
  `;

  return baseEmailWrapper({
    title,
    subtitle,
    bodyHtml,
    actionButton: {
      label: "Confirm Account Deletion",
      url: confirmUrl,
    },
    secondaryNotice:
      "This link is valid for 1 hour and can only be used once. If you didn't request this, no action is needed.",
    fallbackLink: confirmUrl,
  });
}

function getNotificationEmailHtml({ title, subtitle, message }) {
  const bodyHtml = `
    <p style="margin: 0 0 12px;">Greetings, Warrior.</p>
    <p style="margin: 0 0 12px;">${message}</p>
  `;

  return baseEmailWrapper({
    title,
    subtitle,
    bodyHtml,
  });
}

module.exports = {
  getVerificationEmailHtml,
  getPasswordResetEmailHtml,
  getEmailChangeEmailHtml,
  getAccountDeletionEmailHtml,
  getNotificationEmailHtml,
};
