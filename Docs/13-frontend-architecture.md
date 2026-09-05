# Frontend Architecture

How the Next.js app under `Frontend/src` is put together — routing,
component composition, state ownership, and the session/auth lifecycle.
This is the map connecting the other frontend docs, not a replacement for
them:

- `10-frontend-and-ui-gamification.docx` — the visual/gamification design
  itself (warrior art, rank emblems, HUD).
- `11-frontend-backend-reconciliation-contract.md` — what happens to state
  after a mutation is sent to the backend.
- `05-lifecycle-and-architecture.md` — deployment topology
  (Vercel / Render / TiDB), which is backend/infra scope, not this doc.

This document covers what those don't: where code lives, who owns which
piece of state, and how a request actually gets from a click to the
backend and back.

## 1. Directory map

- `app/` — Next.js App Router routes. Each route is a thin `page.jsx` that
  mounts exactly one top-level component and does nothing else.
- `components/auth/` — the pre-session screens (login, signup, forgot/reset
  password) and their shared `FormZone` shell.
- `components/dashboard/` — the authenticated app: `DashboardApp.jsx`
  (container) plus `components/` (presentation) and `styles/` (the CSS-in-JS
  stylesheet).
- `components/common/` — small shared primitives (`FormInput`, `LogoImage`)
  used on both sides of the session boundary.
- `components/scene/` and `components/pwa/` — the pre-login hero scene
  (warrior + rings + particles) and the service-worker registration
  component respectively.
- `hooks/` — one hook per concern (habits, review session, auth flow,
  account flow, aura energy, toast, day boundary, ambient fx).
- `services/` — API clients (`authApi.js`, `dashboardApi.js`) and
  `tokenStore.js`, the single accessor for the in-memory access token.
- `constants/` — static, non-fetched data: journey/rank titles, character
  art paths, habit difficulty/XP table, aura presentation constants.
- `utils/` — date/timezone math and an email-provider deep-link helper.

## 2. Two layers of routing

**Next.js App Router (file-based):** `/`, `/dashboard`, `/verify-email`,
`/reset-password`, `/confirm-email-change`, `/confirm-account-deletion`.
Each `page.jsx` is a pure mount point — the actual logic lives in the
component it renders, not in the route file itself (see
`app/dashboard/page.jsx`: a two-line composition layer with a comment
explicitly saying so).

**Client-side screen switching within a route:** neither of the app's two
real state machines is expressed as separate routes.

- On `/`, `useAuthFlow` owns a `screen` field (`login` / `signup` /
  `forgot` / `reset` / …) that swaps which auth screen renders.
- On `/dashboard`, `DashboardApp` owns a set of early-return checks —
  session still loading, logged out, My Account open, a check-your-email
  interstitial, or the main dashboard — that swap the entire rendered
  output.

> Neither switch touches the URL or triggers a Next.js navigation. This is
> deliberate: these are the same logical screen showing something else, not
> a new page, so there's no reason to pay for a route transition or lose
> in-memory state (a bootstrapped session, already-loaded habits) that a
> real navigation would risk re-fetching.

## 3. Composition pattern: container vs. shell

The authenticated app follows a strict container/presentation split:

- **`DashboardApp.jsx`** owns everything with behavior: the session
  bootstrap, every data hook (`useHabits`, `useReviewSession`,
  `useAccountFlow`, `useAuraEnergy`, `useToast`, `useDayBoundary`), every
  modal's open/closed state, and every event handler passed down as props.
- **`DashboardShell` and its children** (`TopBar`, `HabitsPanel`,
  `JourneySection`, `OverallStatsSection`, `AuraStrip`,
  `PendingReviewBanner`, `BottomNav`, `BackgroundLayer`) are pure
  presentation. `DashboardShell`'s own header comment states the rule
  directly: "All state and behaviour live in DashboardApp and arrive as
  props."
- **Every modal** (`ConfirmDialog`, `ProfileModal`, `HabitDetailModal`,
  `EditHabitModal`, `AddHabitModal`, `ReviewSessionModal`) is mounted at
  the `DashboardApp` root, conditionally, rather than nested inside
  whatever component triggered it. There is exactly one place in the tree
  that decides what's currently open.
- The pre-auth side mirrors this: `FormZone` and the individual screens
  (`LoginScreen`, `SignupScreen`, …) are presentation; `useAuthFlow` owns
  the screen state, form data, validation, and the actual requests.

One deliberate split within the shell: `BackgroundLayer` renders the
full-bleed warrior art for desktop, while `CharacterCard` renders a
compact mobile equivalent — both fed the same props (`gender`, `stage`,
`xpPercent`, …) from `DashboardShell`, so the two layouts never fall out
of sync with each other's progression data.

## 4. State ownership map

| State | Owned by | Source of truth |
|---|---|---|
| Access token (in memory) | `tokenStore.js` (`window` global) | Issued by login / refresh |
| Refresh token | httpOnly cookie (not JS-readable) | Backend |
| Session identity (`meData`) | `DashboardApp` | `GET /api/auth/me` |
| Progress (XP, level, aura, shields, global streak) | `DashboardApp` (`progressData`) | `GET /api/progress` |
| Habits + per-habit streak/pending state | `useHabits` | `GET /api/habits`, `/api/habits/:id`, `/api/habits/:id/logs` |
| Review queue / in-progress decision | `useReviewSession` | Derived from habits' `pendingReviewDates`, committed via `POST /api/review/decisions` |
| Toast queue | `useToast` | Local only, never persisted |
| Ambient particle layouts | `useAmbientFx` | Local only, memoized random, never persisted |
| Auth screen + form fields | `useAuthFlow` | Local until submit |
| Account screen state (My Account / logged out / check-email) | `useAccountFlow` | Local, driven by auth endpoints |

The rule that falls out of this table: **anything that is a fact about the
user's progress is owned by a hook backed by a `GET` endpoint**, and its
reconciliation after a mutation follows
`11-frontend-backend-reconciliation-contract.md`. Anything that is purely
an interaction concern — which modal is open, which tab is active, form
values, the toast queue, particle positions — is local state with no
server round-trip and no persistence.

## 5. Session bootstrap sequence

1. On mount, `DashboardApp` checks for an in-memory access token. A fresh
   page load never has one, so it calls `refreshAccessToken()`, trading the
   httpOnly refresh cookie for a new access token.
2. It then fetches `GET /api/auth/me`, `GET /api/progress`, and
   `GET /api/profile` in parallel. Any failure anywhere in this chain
   clears the access token and redirects to `/`.
3. Once `meData` resolves (specifically, its `timezone`), a second effect
   calls `loadHabits(timezone)`. Its failure also redirects to `/`.
4. Only once both stages have succeeded does `sessionReady` flip true.
   Until then, an explicit guard (`!sessionReady || !habitsLoaded`) renders
   a loading state instead of a partially-populated dashboard.

## 6. Same-origin API layer (the proxy)

`proxy.js` is Next.js middleware matched on `/api/:path*` that rewrites
every matching request, server-side, to `BACKEND_INTERNAL_URL`. From the
browser's perspective every API call is same-origin (`/api/habits`, not a
cross-origin URL), so cookies flow as first-party and there is no CORS
configuration anywhere in the frontend. In production, a missing
`BACKEND_INTERNAL_URL` throws immediately rather than silently falling
back to `localhost` — a misconfigured deploy fails loudly at request time
instead of quietly proxying nowhere.

## 7. Auth token lifecycle & cross-tab coordination

- **Access token:** a short-lived JWT kept only in a `window` global —
  never `localStorage`, never a client-readable cookie. A reload always
  loses it by design.
- **Refresh token:** long-lived, httpOnly, set by the backend. Survives
  reloads, invisible to any frontend JS.
- `authedFetch` (`dashboardApi.js`) recovers from a `401` with exactly one
  silent refresh-and-retry. It snapshots a "logout generation" counter
  first, so if the user logs out while that refresh is in flight, the
  retry doesn't fire with a token the refresh just reinstated — a
  state-mutating request completing after the user has already been shown
  the signed-out screen would be worse than just letting the `401` stand.
- Because the backend's refresh tokens are single-use, two browser tabs
  refreshing at the same moment would look like token replay to the
  backend. `tokenStore.js` resolves this with a cross-tab leader election:
  a `localStorage` lock plus a `BroadcastChannel` named
  `aurakon:token-refresh`. Whichever tab acquires the lock performs the
  real refresh and broadcasts the result; every other tab just waits on
  the channel, falling back to its own independent refresh only if the
  leader doesn't respond within the lock timeout (covers a crashed leader
  tab).

## 8. Cross-cutting hooks

- **`useToast`** — a queue, not a single slot. A single check-in can
  legitimately fire several reward toasts in the same synchronous tick
  (XP, a shield earned, a consistency bonus); a single-slot implementation
  would have each call clobber the last before it ever painted.
- **`useDayBoundary`** — schedules a callback for the exact next midnight
  in the user's IANA timezone, plus a `visibilitychange` listener to catch
  a tab that was backgrounded straight through the scheduled timeout.
- **`useAmbientFx`** — pure decorative particle-position generators
  (sparkles, rising embers, gold sparks), memoized on their count so a
  re-render never reshuffles the scenery. `useCrossfadeImage` from the
  same file drives the warrior-avatar stage transitions described in
  `10-frontend-and-ui-gamification.docx`.
- **`useAuraEnergy`** — owns only the pulse-animation timing; the energy
  value itself is always the server's, re-synced by the consumer after
  every progression-affecting action.

## 9. Styling architecture

Dashboard styling is one CSS-in-JS string (`dashboardStyles.js`, ~96 KB)
injected via a single `<style>` tag scoped under the `.aura-app` class,
rather than CSS modules or a utility framework. `AppFrame`
(`DashboardApp.jsx`) is the one mount point for this stylesheet plus a
small set of page-frame rules (width, base type scale, font smoothing).

> This keeps every visual rule addressable from one file by section
> comment, at the cost of no build-time scoping or purging — uniqueness of
> class names is a discipline the codebase maintains by hand rather than
> something tooling enforces.

## 10. What this document doesn't cover

- Mutation outcomes, optimistic updates, and race guards — see
  `11-frontend-backend-reconciliation-contract.md`.
- The visual design of the gamification layer itself — see
  `10-frontend-and-ui-gamification.docx`.
- Server-side computation of streaks, XP, and shields — see
  `02-streaks-and-pending-reviews.md`, `03-progression-and-rewards.md`,
  `04-guardian-shield.md`.
- Deployment topology and the production trust boundary — see
  `05-lifecycle-and-architecture.md`.

## Reviewer takeaways

The frontend has exactly two "routers": Next.js's file-based one for
genuinely distinct pages, and a plain-`useState` screen switch for
anything that's really the same page showing something else. Nearly every
other structural decision here follows from one rule — presentation
components never own state, and every hook that touches progress data
treats the server as the only source of truth. A new feature that adds
state directly to a presentation component, or that reads/writes progress
data without going through a hook backed by the corresponding endpoint, is
breaking a pattern the rest of the app relies on, not introducing a new one.
