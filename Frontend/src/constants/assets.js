// Centralized static asset paths served from /public.
// Previously these paths were duplicated as local string literals in
// page.jsx, LogoImage.jsx, WarriorImage.jsx, and SceneStyles.jsx.
// Consolidating them here means a future asset rename only needs to
// happen in one place.

export const LOGO_IMAGE = "/assets/logo.png";
export const WARRIOR_IMAGE = "/assets/warrior.png";
export const SCENE_BACKGROUND_IMAGE = "/assets/scene-bg.jpg";

/* ------------------------------------------------------------------ */
/* Dashboard asset paths (also served from /public).                   */
/* ------------------------------------------------------------------ */

export const BRAND_LOGO = "/assets/logo.png";
export const GLOBAL_STREAK_LOGO = "/assets/global-streak-logo.png";
export const XP_ICON = "/assets/xp-icon.png";
export const CURRENT_STREAK_ICON = "/assets/current streak.png";
export const LEVEL_ICON = "/assets/level icon.png";
export const CROWN_ICON = "/assets/crown.png";
export const PENDING_REVIEW_ICON = "/assets/pending review.png";

/**
 * CHARACTER_ASSETS
 * Embedded, high-quality versions of the 18 character-progression scenes
 * (male 1-9, female 1-9) supplied for this product. The correct set
 * (male/female) comes from the user's stored profile and the correct
 * stage (1-9) from their current title tier - everything below only ever
 * reads CHARACTER_ASSETS[gender][stage].
 */
export const CHARACTER_ASSETS = {
  male: {
    1: "/assets/character-male-1.jpg",
    2: "/assets/character-male-2.jpg",
    3: "/assets/character-male-3.jpg",
    4: "/assets/character-male-4.jpg",
    5: "/assets/character-male-5.jpg",
    6: "/assets/character-male-6.jpg",
    7: "/assets/character-male-7.jpg",
    8: "/assets/character-male-8.jpg",
    9: "/assets/character-male-9.jpg",
  },
  female: {
    1: "/assets/character-female-1.jpg",
    2: "/assets/character-female-2.jpg",
    3: "/assets/character-female-3.jpg",
    4: "/assets/character-female-4.jpg",
    5: "/assets/character-female-5.jpg",
    6: "/assets/character-female-6.jpg",
    7: "/assets/character-female-7.jpg",
    8: "/assets/character-female-8.jpg",
    9: "/assets/character-female-9.jpg",
  },
};

/* ------------------------------------------------------------------ */
/* Rank emblems - the heart of the progression system. Each of the 9    */
/* emblems is the exact artwork supplied for this product, used as-is   */
/* and never redrawn - only its presentation (aura, glow, saturation)   */
/* changes with progression state so the climb reads clearly through    */
/* lighting alone: dormant and unlit while locked, softly lit once      */
/* earned, and blazing at full, focus-drawing brilliance for whichever  */
/* rank is current.                                                     */
/* ------------------------------------------------------------------- */
export const RANK_IMAGES = {
  1: "/assets/rank-1.png",
  2: "/assets/rank-2.png",
  3: "/assets/rank-3.png",
  4: "/assets/rank-4.png",
  5: "/assets/rank-5.png",
  6: "/assets/rank-6.png",
  7: "/assets/rank-7.png",
  8: "/assets/rank-8.png",
  9: "/assets/rank-9.png",
};
