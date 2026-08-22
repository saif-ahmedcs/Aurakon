// Centralized static asset paths served from /public.
// Previously these paths were duplicated as local string literals in
// page.jsx, LogoImage.jsx, WarriorImage.jsx, and SceneStyles.jsx.
// Consolidating them here means a future asset rename only needs to
// happen in one place.

export const LOGO_IMAGE = "/assets/logo.png";
export const WARRIOR_IMAGE = "/assets/warrior.png";
export const SCENE_BACKGROUND_IMAGE = "/assets/scene-bg.jpg";
