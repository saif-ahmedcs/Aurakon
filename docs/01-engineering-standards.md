# Project Standing Rules

## 1. Same-origin rule

All backend requests must assume same-origin unless explicitly configured otherwise. No cross-origin logic unless required later in the project.

## 2. asyncHandler rule

All async route handlers must use a wrapper (asyncHandler) to avoid repeating try/catch blocks.

## 3. UTC dates rule

All timestamps stored in the database must remain in UTC.

User-facing day calculations (today, yesterday, streaks, review windows, etc.) must always use the user's configured timezone, while storage remains UTC.
