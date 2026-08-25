/* ---------------------------------------------------------------- */
/* Icon set - small presentational SVG/image glyphs used across the  */
/* dashboard. Pure render only; no state, no hooks.                  */
/* ---------------------------------------------------------------- */

import { BRAND_LOGO, XP_ICON, CURRENT_STREAK_ICON, PENDING_REVIEW_ICON } from "../../../constants/assets";

export function LogoMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <img
        src={BRAND_LOGO}
        alt=""
        className="brand-mark-img"
        draggable="false"
      />
    </span>
  );
}

export function XpIcon({ size = 14, className = "" }) {
  return (
    <img
      src={XP_ICON}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`xp-icon ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

export function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 18 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 1h18M0 7h18M0 13h18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DotsIcon() {
  return (
    <svg
      width="16"
      height="4"
      viewBox="0 0 16 4"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="2" cy="2" r="1.7" fill="currentColor" />
      <circle cx="8" cy="2" r="1.7" fill="currentColor" />
      <circle cx="14" cy="2" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg
      width="12"
      height="10"
      viewBox="0 0 12 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 5l3.2 3.2L11 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HourglassIcon() {
  return (
    <svg
      width="11"
      height="14"
      viewBox="0 0 11 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 1h8M1.5 13h8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M2.2 1.2c0 2.9 2.15 3.4 2.15 5.8s-2.15 2.9-2.15 5.8M8.8 1.2c0 2.9-2.15 3.4-2.15 5.8s2.15 2.9 2.15 5.8"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
      />
      <path
        d="M2.6 1.8h5.8c-.35 2.1-1.7 2.9-2.9 4.2-1.2-1.3-2.55-2.1-2.9-4.2z"
        fill="currentColor"
        opacity=".5"
      />
    </svg>
  );
}

export function CrownIcon() {
  return (
    <svg
      width="15"
      height="13"
      viewBox="0 0 15 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 4.5L4 6.5 7.5 1l3.5 5.5 3-2-1 7H2L1 4.5z"
        fill="url(#crownGrad)"
        stroke="url(#crownGrad)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="crownGrad"
          x1="1"
          y1="1"
          x2="14"
          y2="11.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e4c9ff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GemIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6.5 0L9 3.5H4L6.5 0z" fill="#c9a3ff" />
      <path d="M4 3.5h5l1.7 2.2L6.5 13 .8 5.7 4 3.5z" fill="url(#gemGrad)" />
      <defs>
        <linearGradient
          id="gemGrad"
          x1="0"
          y1="3"
          x2="13"
          y2="13"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e4c9ff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CompassRuneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.4" stroke="url(#runeGrad)" strokeWidth="1" />
      <path
        d="M8 0.6v2M8 13.4v2M0.6 8h2M13.4 8h2M2.5 2.5l1.4 1.4M12.1 12.1l1.4 1.4M2.5 13.5l1.4-1.4M12.1 3.9l1.4-1.4"
        stroke="url(#runeGrad)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="2" fill="url(#runeGrad)" />
      <defs>
        <linearGradient
          id="runeGrad"
          x1="0"
          y1="0"
          x2="16"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e4d4ff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function MedalStarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 0.6l1.55 3.3 3.6.42-2.68 2.48.72 3.58L7 8.98 3.81 10.38l.72-3.58L1.85 4.32l3.6-.42L7 0.6z"
        fill="url(#medalGrad)"
      />
      <defs>
        <linearGradient
          id="medalGrad"
          x1="1.85"
          y1="0.6"
          x2="12.15"
          y2="10.38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f4e9ff" />
          <stop offset="1" stopColor="#b28cf0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CurrentStreakIcon({ size = 26, className = "" }) {
  return (
    <img
      src={CURRENT_STREAK_ICON}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`current-streak-icon ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

export function CrossedSwordsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 1l5.2 5.2M1 1l1 3.2L1 1l3.2 1z"
        stroke="url(#swordGradA)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 6.2L2 15l1.4-1L6.9 7.7"
        stroke="url(#swordGradA)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 1l-5.2 5.2M15 1l-1 3.2L15 1l-3.2 1z"
        stroke="url(#swordGradB)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.8 6.2L14 15l-1.4-1L9.1 7.7"
        stroke="url(#swordGradB)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="swordGradA"
          x1="1"
          y1="1"
          x2="7"
          y2="15"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f4e9ff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient
          id="swordGradB"
          x1="15"
          y1="1"
          x2="9"
          y2="15"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f4e9ff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HomeTabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 9.5L10 3l7 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 8.5V16.5a1 1 0 001 1h8a1 1 0 001-1V8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HabitsTabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3.5"
        width="14"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 8l2 2 4-4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 13h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function JourneyTabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 8.6V13M6.5 17c0-2 1.5-3.4 3.5-3.4S13.5 15 13.5 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProfileTabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="6.8"
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.2 17c1.1-3.6 4.2-5.4 6.8-5.4S15.7 13.4 16.8 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ascending bars - "Progress" tab in the bottom navigation */
export function ProgressTabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 17h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="4" y="10" width="3.2" height="5" rx="1" fill="currentColor" />
      <rect x="8.9" y="6.5" width="3.2" height="8.5" rx="1" fill="currentColor" />
      <rect x="13.8" y="3" width="3.2" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Icons: shield / pending review / calendar nav / close              */
/* ---------------------------------------------------------------- */

export function ShieldIcon({ size = 28 }) {
  return (
    <img
      src="/assets/shield-icon.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size * 1.01}
      style={{
        width: size,
        height: size * 1.01,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        filter: "drop-shadow(0 0 4px rgba(140,70,255,.6))",
      }}
    />
  );
}

export function PendingIcon({ size = 24 }) {
  return (
    <img
      src={PENDING_REVIEW_ICON}
      alt=""
      aria-hidden="true"
      draggable="false"
      style={{
        /* the source png carries ~15% transparent padding on every side,
           so scale up to keep the visible artwork true to `size` */
        width: size,
        height: size,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        flex: "none",
        transform: "scale(1.3)",
        filter: "drop-shadow(0 0 6px rgba(232,171,79,.45))",
      }}
    />
  );
}

export function ChevronLeftIcon() {
  return (
    <svg
      width="8"
      height="13"
      viewBox="0 0 8 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 1L1.4 6.5 7 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg
      width="8"
      height="13"
      viewBox="0 0 8 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 1l5.6 5.5L1 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 1l11 11M12 1L1 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CalendarGlyphIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="0.8"
        y="1.6"
        width="11.4"
        height="10.4"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="M0.8 4.6h11.4M3.6 0.6v2.2M9.4 0.6v2.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PinIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11.4 1.6l3 3-2.1 2.1.6 2.4-2 2-2-2-3.4 3.4-1.6-1.6L7.3 7.5l-2-2 2-2 2.4.6 2.1-2.1-.4-.4z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M10.2 2.4l3.4 3.4M9 3.6L6.6 6 8 7.4l2.4-2.4M6.6 6L2.2 10.4M4.6 12.4l1.2-1.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M2 14l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* Royal pen - the "edit username" affordance in the profile dialog */
export function QuillIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.7 2.9a1.7 1.7 0 012.4 0 1.7 1.7 0 010 2.4l-7.6 7.6L2 14l1.1-3.5z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M10.7 2.9a1.7 1.7 0 012.4 0 1.7 1.7 0 010 2.4l-7.6 7.6L2 14l1.1-3.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 3.7l2.4 2.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M3.1 10.5l2.4 2.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* Fantasy "rune seal" icons for confirming / cancelling the inline
  * username edit, a hexagonal sigil stone etched with a check-rune
 * (save) or a crossed break-rune (cancel), echoing the rest of the
 * RPG-flavored iconography (medals, shields, pins) used in profile. */
export function RuneConfirmIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 1.4l7.2 4.15v8.9L10 18.6l-7.2-4.15v-8.9L10 1.4z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M10 1.4l7.2 4.15v8.9L10 18.6l-7.2-4.15v-8.9L10 1.4z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <circle
        cx="10"
        cy="10"
        r="6.35"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.35"
        fill="none"
      />
      <path
        d="M6.6 10.1l2.3 2.3 4.6-4.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function RuneCancelIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 1.4l7.2 4.15v8.9L10 18.6l-7.2-4.15v-8.9L10 1.4z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M10 1.4l7.2 4.15v8.9L10 18.6l-7.2-4.15v-8.9L10 1.4z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <circle
        cx="10"
        cy="10"
        r="6.35"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.35"
        fill="none"
      />
      <path
        d="M7.4 7.4l5.2 5.2M12.6 7.4l-5.2 5.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function EyeIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 7c1.8-3.6 5.2-6 9-6s7.2 2.4 9 6c-1.8 3.6-5.2 6-9 6s-7.2-2.4-9-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
      <circle
        cx="10"
        cy="7"
        r="2.6"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}

export function EyeOffIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 7c1.8-3.6 5.2-6 9-6s7.2 2.4 9 6c-1.8 3.6-5.2 6-9 6s-7.2-2.4-9-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />
      <circle
        cx="10"
        cy="7"
        r="2.6"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M1.5 12.5l17-11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WarningIcon({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 2.6l11 19.4H2L13 2.6z"
        fill="rgba(193,97,90,0.16)"
        stroke="#c1615a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 10v5.4"
        stroke="#c1615a"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="13" cy="18.6" r="1.15" fill="#c1615a" />
    </svg>
  );
}
