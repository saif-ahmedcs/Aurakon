# Project Standing Rules

## 1. Same-origin rule

All backend requests must assume same-origin unless explicitly configured otherwise. No cross-origin logic unless required later in the project.

## 2. asyncHandler rule

All async route handlers must use a wrapper (asyncHandler) to avoid repeating try/catch blocks.

## 3. UTC dates rule

All timestamps stored in the database must remain in UTC.

User-facing day calculations (today, yesterday, streaks, review windows, etc.) must always use the user's configured timezone, while storage remains UTC.

The user's configured timezone is the source of truth. It may be updated manually at any time, and client-side timezone detection should only suggest an update—it must never change the stored timezone automatically.

> _Design note:_ Changing the stored timezone is _not_ retroactive.
> It only affects day-boundary calculations (today, streaks, review
> windows, daily_aura_stats, etc.) going forward from the change.
> Historical daily_aura_stats rows and anything derived from them stay
> keyed to the day boundaries that were in effect when they were
> recorded and are never recalculated after a timezone change.

## 4. Email delivery

Transactional emails (verification, resend verification, password reset, email-change confirmation, account-deletion confirmation) are sent via Gmail SMTP (`services/emailService.js`) using `GMAIL_USER` and `GMAIL_APP_PASSWORD` from `.env`.

- Gmail SMTP was chosen as a zero-cost solution, avoiding provider signup, billing, or business-domain requirements.
- `sendEmail()` is fire-and-forget: `authEvents.emit(...)` does not await delivery. Email failures do **not** fail the API request and are only logged via `[emailService]`.
- Deliverability is best to Gmail addresses. Other providers (Outlook, Yahoo, etc.) may place emails in spam because the sender has no established reputation.
- Every email includes both `html` and a derived `text` version to improve deliverability.

> **Design note:** The application is provider-agnostic. Changing the email provider only requires replacing the transporter in `emailService.js`.
