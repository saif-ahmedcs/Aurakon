/**
 * Opens the user's email provider for a given address - webmail for
 * known providers, a mailto: link otherwise. Shared by the login
 * verification screens and the dashboard's check-email hops.
 */
export function openEmailProvider(email) {
  if (typeof window === "undefined") return;

  if (!email) {
    window.location.href = "mailto:";
    return;
  }

  const domain = email.split("@")[1]?.toLowerCase().trim() || "";

  if (domain.includes("gmail") || domain.includes("googlemail")) {
    window.open("https://mail.google.com", "_blank", "noopener,noreferrer");
    return;
  }
  if (
    domain.includes("outlook") ||
    domain.includes("hotmail") ||
    domain.includes("live") ||
    domain.includes("msn")
  ) {
    window.open("https://outlook.live.com", "_blank", "noopener,noreferrer");
    return;
  }
  if (domain.includes("yahoo") || domain.includes("ymail")) {
    window.open("https://mail.yahoo.com", "_blank", "noopener,noreferrer");
    return;
  }
  if (
    domain.includes("icloud") ||
    domain.includes("me.com") ||
    domain.includes("mac.com")
  ) {
    window.open("https://www.icloud.com/mail", "_blank", "noopener,noreferrer");
    return;
  }
  if (domain.includes("proton")) {
    window.open("https://mail.proton.me", "_blank", "noopener,noreferrer");
    return;
  }

  window.location.href = `mailto:${email}`;
}
