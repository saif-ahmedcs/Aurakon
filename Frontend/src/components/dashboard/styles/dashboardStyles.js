export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Cinzel+Decorative:wght@700;900&family=Shippori+Mincho:wght@500;600;700;800&family=Zen+Old+Mincho:wght@500;600;700;900&display=swap');

@font-face {
  font-family: 'CatCafe';
  src: url('/fonts/CatCafe.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

.aura-app {
  --bg: #050408;
  --card: rgba(15, 10, 26, 0.58);
  --card-strong: rgba(16, 11, 28, 0.92);
  --border: rgba(190, 150, 255, 0.16);
  --border-strong: rgba(216, 184, 255, 0.4);
  --accent: #a855f7;
  --accent-deep: #7c3aed;
  --accent-bright: #d8b8ff;
  --accent-soft: rgba(168, 85, 247, 0.32);
  --gold: #e8c988;
  --t1: #f8f6fc;
  --t2: rgba(248, 246, 252, 0.62);
  --t3: rgba(248, 246, 252, 0.38);
  --green: #5fb583;
  --violet-muted: #9d8ad6;
  --red-muted: #c1615a;
  --radius-lg: 24px;
  --radius-md: 15px;
  --radius-sm: 10px;

  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--t1);
  font-family: "Zen Old Mincho", "Shippori Mincho", "Cinzel", Georgia, "Times New Roman", serif;
  box-sizing: border-box;
  isolation: isolate;
}
.aura-app *, .aura-app *::before, .aura-app *::after { box-sizing: border-box; }
.aura-app button { font-family: inherit; cursor: pointer; }
.aura-app :focus-visible { outline: 2px solid var(--accent-bright); outline-offset: 2px; border-radius: 6px; }

/* Themed scrollbars - every scrollable surface (modals, overlays, the
 * page itself) otherwise falls back to the browser's default scrollbar,
 * which renders as a plain light/white bar with square edges and reads
 * as a foreign UI element dropped onto the dark aura theme. This makes
 * the thumb a slim glowing accent pill that floats off the track instead. */
.aura-app { scrollbar-width: thin; scrollbar-color: var(--accent-soft) transparent; }
.aura-app *::-webkit-scrollbar { width: 8px; height: 8px; }
.aura-app *::-webkit-scrollbar-track { background: transparent; }
.aura-app *::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--accent), var(--accent-deep));
  border-radius: 999px;
}
.aura-app *::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, var(--accent-bright), var(--accent));
}
.aura-app *::-webkit-scrollbar-corner { background: transparent; }

/* Section titles use the ornate "Cinzel Decorative" display face, with
 * "Shippori Mincho" as a Japanese-serif fallback; everything else
 * (section content/body text) stays on the "Zen Old Mincho" royal
 * Japanese-fantasy font set as the app-wide default above. */
.aura-app h1,
.aura-app h2,
.aura-app h3,
.aura-app h4,
.aura-app h5,
.aura-app h6 {
  font-family: "Cinzel Decorative", "Shippori Mincho", "Zen Old Mincho", Georgia, "Times New Roman", serif;
  letter-spacing: 0.03em;
  text-shadow: 0 0 14px rgba(232, 201, 136, 0.35), 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* ---------- cinematic full-page background ---------- */
.bg-layer { position: fixed; inset: 0; z-index: 0; overflow: hidden; background: var(--bg); }

/* Ambient embers - fixed to the viewport (not scoped to any one panel), so they cover the whole page, top to bottom, at every scroll position. Slow and faint on purpose - styled as drifting fire embers, not starlight. */
.ambient-spark-field { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.ambient-sparkle {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, #fff3d2 0%, #ffc266 35%, #ff8a3d 65%, #ff5722 85%, transparent 100%);
  box-shadow: 0 0 8px 2px rgba(255,110,40,.5);
  opacity: 0; transform: translateY(0) scale(.3);
  animation-name: ambientEmberFlicker; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
}
@keyframes ambientEmberFlicker {
  0%, 100% { opacity: 0; transform: translateY(0) scale(.3); }
  45% { opacity: .6; transform: translateY(-14px) scale(1); }
  55% { opacity: .5; transform: translateY(-16px) scale(.9); }
}
@media (prefers-reduced-motion: reduce) {
  .ambient-sparkle { animation: none; opacity: .2; transform: scale(.7); }
}
/* On wide, short desktop viewports plain object-fit: cover has to scale
   the art up to fill the width, which crops hard into the top/bottom and
   leaves the character filling almost the entire frame with no
   breathing room - reads as "zoomed in". Scaling the whole frame back
   down from a point near the character (rather than the viewport
   centre) pulls in extra headroom/footroom on all sides while keeping
   him roughly where the layout expects him. That leaves the now-smaller
   frame's own rectangular edge exposed as a hard "photo has ended" seam
   against the flat background colour - see .bg-img-fade below, which
   blends it away. */
.bg-img-frame { position: absolute; inset: 0; transform: scale(0.8); transform-origin: 20% 45%; }
/* Fades the four edges of the scaled-down frame into .bg-layer's own
   background colour instead of leaving a hard cutoff. With scale(0.8)
   from transform-origin 20% 45% the frame's visible edges land at fixed
   percentages of the viewport regardless of its size (left ~4%, right
   ~84%, top ~9%, bottom ~89%), so each gradient starts solid exactly at
   that edge. A plain two-stop linear fade still shows as a faint ramp
   up close (the eye is very sensitive to gradient edges/Mach bands), so
   each direction uses several rgba stops easing out - steep right at
   the seam, then progressively gentler - over a wide enough span that
   there's no point where the eye can still find a line. Sits above the
   image, below the vignette. */
.bg-img-fade {
  position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(to right,
      rgba(5,4,8,1) 0%, rgba(5,4,8,.92) 4%, rgba(5,4,8,.7) 10%,
      rgba(5,4,8,.42) 18%, rgba(5,4,8,.18) 26%, rgba(5,4,8,0) 36%),
    linear-gradient(to left,
      rgba(5,4,8,1) 0%, rgba(5,4,8,.92) 6%, rgba(5,4,8,.7) 14%,
      rgba(5,4,8,.42) 24%, rgba(5,4,8,.18) 34%, rgba(5,4,8,0) 46%),
    linear-gradient(to bottom,
      rgba(5,4,8,1) 0%, rgba(5,4,8,.92) 5%, rgba(5,4,8,.7) 12%,
      rgba(5,4,8,.42) 20%, rgba(5,4,8,.18) 29%, rgba(5,4,8,0) 40%),
    linear-gradient(to top,
      rgba(5,4,8,1) 0%, rgba(5,4,8,.92) 5%, rgba(5,4,8,.7) 13%,
      rgba(5,4,8,.42) 22%, rgba(5,4,8,.18) 32%, rgba(5,4,8,0) 44%);
}
.bg-img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 18% center;
  transform-origin: 22% 42%;
  animation: heroImgIn 1.7s cubic-bezier(.16,1,.3,1) both, heroImgDrift 28s ease-in-out 1.7s infinite alternate;
}
@keyframes heroImgIn { from { opacity: 0; transform: scale(1.06); filter: brightness(.72) saturate(.85); } to { opacity: 1; transform: scale(1); filter: brightness(1) saturate(1); } }
@keyframes heroImgDrift { from { transform: scale(1); } to { transform: scale(1.018); } }
.bg-img-incoming { opacity: 0; animation: sceneFade 1.1s ease forwards; }
@keyframes sceneFade { to { opacity: 1; } }
.bg-vignette {
  position: absolute; inset: 0;
  background:
    linear-gradient(100deg, rgba(3,2,8,0.05) 0%, rgba(3,2,8,0.35) 26%, rgba(3,2,8,0.82) 44%, rgba(3,2,8,0.96) 60%, rgba(3,2,8,0.99) 100%),
    linear-gradient(0deg, rgba(3,2,8,0.7) 0%, rgba(3,2,8,0) 26%),
    linear-gradient(180deg, rgba(3,2,8,0.55) 0%, rgba(3,2,8,0) 20%);
  pointer-events: none;
}
.bg-character-glow {
  position: absolute; left: -10%; top: 14%; width: 620px; height: 760px;
  background: radial-gradient(ellipse at 42% 40%, rgba(168,85,247,0.24), transparent 68%);
  filter: blur(70px); pointer-events: none; mix-blend-mode: screen;
}
.bg-glow-blob {
  position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; mix-blend-mode: screen;
}
.bg-glow-blob-a { width: 620px; height: 620px; right: -160px; top: -120px; background: radial-gradient(circle, rgba(124,58,237,0.28), transparent 70%); }
.bg-glow-blob-b { width: 520px; height: 520px; right: 8%; bottom: -140px; background: radial-gradient(circle, rgba(168,85,247,0.2), transparent 70%); }

/* ---------- hero identity plate (desktop bg + mobile character card) ---------- */
.hero-plate {
  position: absolute; z-index: 1; left: clamp(40px, calc(38vw - 300px), 212px); right: auto; bottom: 68px; max-width: 280px;
  display: flex; flex-direction: column; gap: 9px; pointer-events: none;
  animation: heroPlateIn 1s cubic-bezier(.16,1,.3,1) .5s both;
}
@keyframes heroPlateIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.hero-plate-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--gold);
  text-shadow: 0 0 12px rgba(232,201,136,.5);
}
.hero-plate-title {
  margin: 0; font-size: 34px; font-weight: 800; line-height: 1.06; letter-spacing: -.01em;
  background: linear-gradient(120deg, #f4eeff 0%, #d8b8ff 42%, #a855f7 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 24px rgba(140,70,255,.5));
}
.hero-plate-bar-track {
  height: 5px; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; margin-top: 3px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
}
.hero-plate-bar-fill {
  height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--accent-deep), var(--accent-bright));
  box-shadow: 0 0 10px rgba(168,85,247,.65);
}
.hero-plate-sub { font-size: 12.5px; color: var(--t2); font-weight: 600; letter-spacing: .01em; }

.character-card .hero-plate { left: 20px; right: 20px; bottom: 18px; max-width: none; }
.character-card .hero-plate-title { font-size: 23px; }

.sparkle-layer { position: absolute; inset: 0; pointer-events: none; }
.sparkle {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, #fff3d2 0%, #ffc266 32%, #ff8a3d 62%, #ff5722 85%, transparent 100%);
  opacity: 0; animation: fireSparkle ease-in-out infinite;
  box-shadow: 0 0 7px 1.5px rgba(255,110,40,.55);
}
@keyframes fireSparkle {
  0%, 100% { opacity: 0; transform: translateY(0) scale(.4); }
  50% { opacity: .8; transform: translateY(-10px) scale(1.1); }
}
@media (prefers-reduced-motion: reduce) {
  .sparkle { animation: none; opacity: .25; transform: scale(.7); }
}
.rising-ember-field { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.ember {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, #fff3d2 0%, #ffc266 32%, #ff8a3d 62%, #ff5722 85%, transparent 100%);
  filter: drop-shadow(0 0 4px rgba(255,110,40,.65));
  opacity: 0; transform: translate(0, 0) scale(.4);
  animation-name: emberDrift; animation-timing-function: ease-out; animation-iteration-count: infinite;
}
@keyframes emberDrift {
  0% { opacity: 0; transform: translate(0, 0) scale(.4); }
  12% { opacity: .9; }
  60% { opacity: .65; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.15); }
}
@media (prefers-reduced-motion: reduce) {
  .ember { animation: none; opacity: 0; }
}

/* ---------- foreground content shell ---------- */
.fg { position: relative; z-index: 1; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; overflow-x: clip; }

/* ---------- topbar (highest priority - always the top layer) ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 32px; position: relative; z-index: 2;
}
.topbar::after {
  content: ''; position: absolute; left: 32px; right: 32px; bottom: 0; height: 1px;
  background: linear-gradient(90deg, rgba(216,184,255,.35), rgba(216,184,255,.05) 60%, transparent);
}
.topbar-left { display: flex; align-items: center; gap: 14px; }
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: var(--radius-sm);
  background: rgba(14, 9, 24, 0.5); border: 1px solid var(--border); color: var(--t2);
  backdrop-filter: blur(10px);
  transition: border-color .2s ease, color .2s ease, background .2s ease, box-shadow .2s ease;
}
.icon-btn:hover { color: var(--t1); border-color: var(--border-strong); background: rgba(20,13,36,0.7); box-shadow: 0 0 16px rgba(168,85,247,.25); }
.logo { display: flex; align-items: center; gap: 10px; }
.brand-mark {
  position: relative;
  display: flex; align-items: center; justify-content: flex-start;
  height: 40px;
  transition: transform .2s ease;
}
.brand-mark::before {
  content: "";
  position: absolute; left: -10px; top: 50%; transform: translateY(-50%);
  width: 60px; height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(168,85,247,0.35), transparent 72%);
  filter: blur(8px);
  opacity: .6;
  z-index: 0;
  pointer-events: none;
}
.logo:hover .brand-mark { transform: scale(1.03); }
.brand-mark-img {
  position: relative; z-index: 1;
  height: 40px; width: auto;
  display: block;
  filter: drop-shadow(0 0 10px rgba(168,85,247,.4)) drop-shadow(0 1px 2px rgba(0,0,0,.55));
  user-select: none;
  -webkit-user-drag: none;
}
.xp-icon {
  display: inline-block;
  vertical-align: -2px;
  object-fit: contain;
  margin: 0 3px;
  user-select: none;
  -webkit-user-drag: none;
  flex-shrink: 0;
}

.profile-block {
  display: flex; align-items: center; gap: 10px; padding: 6px 16px 6px 6px;
  background: rgba(14, 9, 24, 0.5); border: 1px solid var(--border); border-radius: 999px;
  color: var(--t1); backdrop-filter: blur(10px);
  transition: border-color .2s ease, background .2s ease, transform .15s ease, box-shadow .2s ease;
}
.profile-block:hover { border-color: var(--border-strong); background: rgba(20,13,36,0.75); box-shadow: 0 0 20px rgba(168,85,247,.28); }
.profile-block:active { transform: scale(.98); }
.avatar {
  position: relative;
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
}
/* Crest emblem in place of a photo - no disc, no border; the emblem's own
   shape-hugging glow (see .rank-emblem-wrap-active) carries the premium
   feel instead of a circular frame that would otherwise read as an empty
   "add a photo" placeholder. */
.avatar-emblem { width: 34px; height: 34px; }
.avatar-level-badge {
  position: absolute; right: -4px; bottom: -4px; min-width: 16px; height: 16px; padding: 0 3px;
  display: flex; align-items: center; justify-content: center; border-radius: 999px;
  background: radial-gradient(circle at 32% 26%, #f4e9c9, var(--gold) 60%, #8a6a2c 100%);
  color: #2a1c05; font-size: 9px; font-weight: 800; line-height: 1;
  border: 1.5px solid var(--bg); box-shadow: 0 0 8px rgba(232,201,136,.6);
}
.profile-text { display: flex; flex-direction: column; line-height: 1.2; text-align: left; }
.profile-name { font-size: 13px; font-weight: 600; }
.profile-title { font-size: 10.5px; color: var(--gold); letter-spacing: .03em; }

/* ---------- overlays / side menu ---------- */
.overlay { position: fixed; inset: 0; background: rgba(3, 2, 8, 0.6); backdrop-filter: blur(3px); z-index: 40; display: flex; }
.overlay-center {
  justify-content: center;
  padding: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}
/* margin:auto centers the dialog but, unlike align-items:center, lets a
   dialog taller than the viewport scroll instead of being clipped */
.overlay-center > * { margin: auto; }
.menu-btn-wrap { position: relative; }

/* Invisible full-screen catcher so a tap anywhere outside the popover
   closes it - unlike .overlay, it has no dimming/blur since the menu
   itself is small and shouldn't darken the whole screen. */
.menu-scrim { position: fixed; inset: 0; z-index: 40; background: transparent; }

/* Compact popover menu anchored to the hamburger button - styled like
   an old-school game HUD tablet (chunky gold border, notch pointing
   back at the button it came from) instead of a full side drawer. */
.game-menu {
  position: absolute; top: calc(100% + 14px); left: 0; z-index: 41;
  width: 204px; padding: 10px 8px;
  background: linear-gradient(160deg, rgba(30,19,48,0.97), rgba(13,9,22,0.98));
  border: 2px solid var(--gold);
  border-radius: 14px;
  box-shadow: 0 4px 0 rgba(0,0,0,0.4), 0 16px 36px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(232,201,136,0.15);
  display: flex; flex-direction: column; gap: 3px;
  transform-origin: top left;
  animation: gameMenuPop .18s cubic-bezier(.2,1.4,.4,1);
}
@keyframes gameMenuPop {
  from { transform: scale(.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.game-menu-notch {
  position: absolute; top: -8px; left: 22px; width: 14px; height: 14px;
  background: rgba(30,19,48,0.97); border-left: 2px solid var(--gold); border-top: 2px solid var(--gold);
  border-radius: 3px 0 0 0; transform: rotate(45deg);
}
.game-menu-item {
  text-align: left; background: transparent; border: none; color: var(--t2);
  font-size: 12px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
  padding: 10px 12px; border-radius: 9px; transition: background .15s ease, color .15s ease, transform .1s ease;
}
.game-menu-item:hover { background: rgba(232,201,136,0.14); color: var(--gold); }
.game-menu-item:active { transform: scale(.97); }
.game-menu-divider { height: 1px; background: var(--border); margin: 5px 6px; }
.game-menu-danger { color: #e2897f; }
.game-menu-danger:hover { background: rgba(193, 97, 90, 0.16); color: #f2a89f; }

/* ---------- layout ---------- */
.content-wrap { flex: 1; padding: 40px 5vw 56px clamp(320px, 38vw, 480px); }
.content-stack { display: flex; flex-direction: column; gap: 22px; max-width: 680px; }

/* ---------- glass panel base ---------- */
.glass-panel {
  position: relative;
  background: linear-gradient(165deg, rgba(17,11,30,0.62), rgba(9,6,17,0.78));
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  backdrop-filter: blur(18px);
  box-shadow: 0 20px 55px rgba(0,0,0,0.5), 0 0 0 1px rgba(190,150,255,0.05), 0 0 44px rgba(140,70,255,0.1);
}

/* ---------- 1. habits (top priority) ---------- */
.habits-panel { padding: 24px; position: relative; z-index: 2; }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.panel-header .eyebrow { margin: 0; }
.eyebrow { font-size: 11.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--t2); font-weight: 600; margin: 0 0 18px; display: flex; align-items: center; gap: 7px; }

.add-habit-btn {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, var(--accent), var(--accent-deep)); color: #fff; border: none;
  font-size: 12.5px; font-weight: 600; padding: 9px 16px; border-radius: 999px;
  box-shadow: 0 8px 22px rgba(124,58,237,0.4), 0 0 20px rgba(168,85,247,.25);
  transition: filter .15s ease, transform .15s ease;
}
.add-habit-btn::before {
  content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
  background: linear-gradient(115deg, transparent, rgba(255,255,255,.45), transparent);
  transform: skewX(-20deg);
}
.add-habit-btn:hover { filter: brightness(1.12); }
.add-habit-btn:hover::before { animation: shine .9s ease; }
@keyframes shine { from { left: -60%; } to { left: 130%; } }
.add-habit-btn:active { transform: scale(.97); }
.add-habit-btn.btn-disabled,
.add-habit-btn:disabled {
  background: rgba(255,255,255,0.08) !important;
  color: var(--t3) !important;
  box-shadow: none !important;
  cursor: default !important;
  filter: none !important;
  transform: none !important;
}
.add-habit-btn.btn-disabled::before,
.add-habit-btn:disabled::before { display: none; }

.habit-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.habit-row {
  position: relative; z-index: 0; display: flex; align-items: center; gap: 14px; padding: 13px 14px 13px 17px;
  border-radius: 12px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.05);
  transition: background .2s ease, border-color .2s ease, transform .2s ease, box-shadow .2s ease;
}
.habit-row:hover { background: rgba(168,85,247,0.07); transform: translateX(2px); border-color: rgba(190,150,255,.18); }
.habit-row-menu-open { z-index: 30; }
.habit-row::before {
  content: ''; position: absolute; left: 0; top: 10%; bottom: 10%; width: 3px; border-radius: 3px;
  opacity: .8;
}
.diff-edge-easy::before { background: var(--green); box-shadow: 0 0 8px rgba(95,181,131,.6); }
.diff-edge-medium::before { background: var(--violet-muted); box-shadow: 0 0 8px rgba(157,138,214,.6); }
.diff-edge-hard::before { background: var(--red-muted); box-shadow: 0 0 8px rgba(193,97,90,.6); }

/* victorious - trial completed */
.habit-row-done { background: rgba(255,255,255,0.035); border-color: rgba(216,184,255,.16); }
.habit-row-done .habit-name { color: var(--t1); }
.habit-row-done::before { opacity: 1; }

/* respectful failure - the trial's window closed, not a red alarm */
.habit-row-missed { background: rgba(255,255,255,0.015); border-color: rgba(255,255,255,0.05); }
.habit-row-missed::before { background: var(--t3); box-shadow: none; opacity: .5; }
.habit-row-missed .habit-name { color: var(--t3); }

.habit-check {
  flex: none; width: 32px; height: 32px; border-radius: 50%; background: radial-gradient(circle at 32% 26%, #1a1228, #0d0916 75%);
  border: 1.5px solid var(--t3); color: transparent; display: flex; align-items: center; justify-content: center;
  position: relative; transition: all .18s ease;
  box-shadow: inset 0 2px 3px rgba(255,255,255,.06), inset 0 -3px 6px rgba(0,0,0,.5);
}
.habit-check::after {
  content: ''; position: absolute; inset: 4px; border-radius: 50%; border: 1px solid rgba(255,255,255,.08); pointer-events: none;
}
.habit-check.diff-easy { border-color: rgba(95,181,131,0.55); animation: sealBreathe 3.4s ease-in-out infinite; }
.habit-check.diff-medium { border-color: rgba(157,138,214,0.55); animation: sealBreathe 3.4s ease-in-out infinite .3s; }
.habit-check.diff-hard { border-color: rgba(193,97,90,0.55); animation: sealBreathe 3.4s ease-in-out infinite .6s; }
@keyframes sealBreathe {
  0%, 100% { box-shadow: inset 0 2px 3px rgba(255,255,255,.06), inset 0 -3px 6px rgba(0,0,0,.5), 0 0 0 0 rgba(190,150,255,0); }
  50% { box-shadow: inset 0 2px 3px rgba(255,255,255,.06), inset 0 -3px 6px rgba(0,0,0,.5), 0 0 0 3px rgba(190,150,255,.1); }
}

.habit-check-on { animation: none !important; color: transparent; }
.habit-check-on.diff-easy { background: radial-gradient(circle at 32% 26%, #b7f0cd, var(--green) 60%, #2f6b48 100%); border-color: transparent; color: #06170e; box-shadow: 0 0 0 3px rgba(95,181,131,.16), 0 0 20px rgba(95,181,131,.7), 0 0 40px rgba(95,181,131,.3); }
.habit-check-on.diff-medium { background: radial-gradient(circle at 32% 26%, #e3d9ff, var(--violet-muted) 60%, #4a3d80 100%); border-color: transparent; color: #12081f; box-shadow: 0 0 0 3px rgba(157,138,214,.16), 0 0 20px rgba(157,138,214,.7), 0 0 40px rgba(157,138,214,.3); }
.habit-check-on.diff-hard { background: radial-gradient(circle at 32% 26%, #f0c9c5, var(--red-muted) 60%, #6b2a24 100%); border-color: transparent; color: #1c0906; box-shadow: 0 0 0 3px rgba(193,97,90,.16), 0 0 20px rgba(193,97,90,.7), 0 0 40px rgba(193,97,90,.3); }

.habit-check-missed {
  animation: none !important; border-color: rgba(255,255,255,.14); color: var(--t3);
  background: radial-gradient(circle at 32% 26%, #221c2c, #100c18 75%);
  box-shadow: inset 0 2px 3px rgba(255,255,255,.04), inset 0 -3px 6px rgba(0,0,0,.55);
}

.habit-main { flex: 1; min-width: 0; }
.habit-top { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; row-gap: 3px; gap: 10px; margin-bottom: 6px; }
.habit-name { font-size: 13.5px; font-weight: 600; color: var(--t2); white-space: nowrap; transition: color .2s ease; }
.habit-diff { font-size: 10.5px; flex: none; }
.diff-text-easy { color: var(--green); }
.diff-text-medium { color: var(--violet-muted); }
.diff-text-hard { color: var(--red-muted); }
.habit-missed-tag { font-size: 9.5px; font-weight: 700; letter-spacing: .06em; color: var(--t3); flex: none; }
.habit-top-meta { display: inline-flex; align-items: center; gap: 10px; flex: none; }
/* Per-habit streak - server-computed (habits.current_streak), rendered
   as a quiet streak counter that lights up while a streak is alive. */
.habit-streak {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; color: var(--t3);
  font-variant-numeric: tabular-nums;
  padding: 3px 10px 3px 6px; border-radius: 999px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
}
.current-streak-icon { display: block; object-fit: contain; flex: none; }
.habit-streak-live {
  color: #d9c6ff;
  background: rgba(139,92,246,0.12); border-color: rgba(168,85,247,0.35);
  box-shadow: 0 0 10px rgba(139,92,246,.25);
}
.habit-pending-badge {
  display: inline-flex; align-items: center; gap: 3px; margin-left: 8px; vertical-align: middle;
  background: rgba(232,171,79,0.14); border: 1px solid rgba(232,171,79,0.4); color: #f0bd72;
  font-size: 10px; font-weight: 700; padding: 2px 7px 2px 5px; border-radius: 999px;
  transition: background .15s ease, box-shadow .15s ease, transform .12s ease;
}
.habit-pending-badge:hover { background: rgba(232,171,79,0.24); box-shadow: 0 0 12px rgba(232,171,79,.35); transform: translateY(-1px); }

.habit-count { flex: none; font-size: 12.5px; color: var(--t2); font-variant-numeric: tabular-nums; }
.habit-count-total { color: var(--t3); }

.habit-menu-wrap { position: relative; flex: none; }
.habit-menu-btn { width: 28px; height: 28px; color: var(--t3); background: transparent; border: none; }
.habit-menu-btn:hover { background: rgba(168,85,247,.12); }
.dropdown {
  position: absolute; right: 0; top: calc(100% + 6px); min-width: 168px; z-index: 50;
  background: #150e24; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  padding: 6px; display: flex; flex-direction: column; box-shadow: 0 14px 34px rgba(0,0,0,0.6), 0 0 24px rgba(140,70,255,.25);
  animation: dropIn .15s ease;
}
@keyframes dropIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.dropdown button { text-align: left; background: transparent; border: none; color: var(--t2); font-size: 12.5px; padding: 8px 10px; border-radius: 8px; }
.dropdown button:hover { background: rgba(168,85,247,0.14); color: var(--t1); }
.dropdown-danger { color: #e2897f !important; }
.dropdown-danger:hover { background: rgba(193,97,90,0.16) !important; color: #f2a89f !important; }

/* ---------- 2. aura energy - now a borderless floating HUD strip,   */
/* no card/panel background - elements sit directly on the page.     */
.aura-strip {
  position: relative;
  display: flex; align-items: center; gap: 14px; padding: 10px 4px;
  width: 100%;
}
.aura-strip-pulse {
}
/* ornate inset gold-violet frame line, echoing an engraved warrior-plate border */
.aura-strip-frame {
  position: absolute; inset: 6px; pointer-events: none; z-index: 1;
  border-radius: calc(var(--radius-lg) - 8px);
  border: 1px solid transparent;
  background: linear-gradient(135deg, rgba(232,201,136,.55), rgba(168,85,247,.15) 35%, rgba(216,184,255,.5) 70%, rgba(232,201,136,.4)) border-box;
  -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: .5;
  filter: drop-shadow(0 0 2px rgba(168,85,247,.4));
  animation: auraFrameLeak 4.8s ease-in-out infinite;
}
/* irregular breathing of the border-line itself, as if energy is      */
/* leaking unevenly along its length rather than glowing uniformly.    */
@keyframes auraFrameLeak {
  0%, 100% { opacity: .38; filter: drop-shadow(0 0 1.5px rgba(168,85,247,.32)); }
  22% { opacity: .58; filter: drop-shadow(0 0 3px rgba(168,85,247,.5)); }
  47% { opacity: .44; filter: drop-shadow(0 0 2px rgba(216,184,255,.38)); }
  68% { opacity: .64; filter: drop-shadow(0 0 4px rgba(168,85,247,.58)); }
  85% { opacity: .46; filter: drop-shadow(0 0 2px rgba(216,184,255,.35)); }
}
/* a very soft outward bloom that hugs the banner's own rounded         */
/* silhouette exactly (box-shadow follows border-radius), so it always */
/* reads as the border itself radiating rather than a separate object. */
.aura-strip-border-glow {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  border-radius: inherit; mix-blend-mode: screen;
  box-shadow:
    0 0 0 1px rgba(216,184,255,.16),
    0 0 10px 1px rgba(168,85,247,.22),
    0 0 22px 2px rgba(140,70,255,.12);
  animation: auraBorderBreathe 5.6s ease-in-out infinite;
}
@keyframes auraBorderBreathe {
  0%, 100% { opacity: .5; }
  40% { opacity: .8; }
  60% { opacity: .62; }
}
.aura-strip-glow {
  position: absolute; top: 50%; left: 65px; width: 180px; height: 180px; transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(140,70,255,.5), transparent 70%);
  filter: blur(6px); pointer-events: none; z-index: 0;
}
/* "Aura Energy" now sits in-flow at the top of the content column,   */
/* left-aligned with the progress bar below it - part of one grouped  */
/* unit with the icon, rather than floating independently.            */
.aura-strip-title {
  font-family: 'CatCafe', var(--heading, cursive); font-weight: 400;
  text-transform: uppercase; letter-spacing: .07em;
  font-size: 23px; line-height: 1;
  background: linear-gradient(90deg, var(--gold), #fff6de 45%, var(--gold));
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 16px rgba(232,201,136,.4);
}
/* the medallion shows only the icon itself - no bezel disc, no hex    */
/* plate. The layout footprint stays fixed so the card's own size      */
/* never changes; the icon is scaled up visually to overflow that      */
/* footprint, so it reads bigger without growing the box.              */
.aura-strip-medallion {
  position: relative; display: flex; align-items: center; justify-content: center; flex: none;
  width: 108px; height: 108px; z-index: 1; overflow: visible;
}
.aura-strip-icon-img {
  width: 108px; height: 108px; object-fit: contain; z-index: 1; flex: none;
  transform: scale(1.75);
}

/* content column: title+percent row sits directly above the bar,     */
/* tightly spaced, so the whole icon/title/percent/bar reads as one   */
/* connected component instead of scattered elements.                 */
.aura-strip-content { display: flex; flex-direction: column; gap: 7px; z-index: 1; flex: 1; min-width: 0; }
.aura-strip-headrow { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.aura-strip-percent {
  font-size: 15px; font-weight: 800; color: var(--t1); font-variant-numeric: tabular-nums;
  text-shadow: 0 0 14px rgba(168,85,247,.75); flex: none;
}
/* the energy track is the main visual anchor of the component - a     */
/* clean beveled channel with a smooth glowing fill, sized up slightly */
/* so it reads as the focal element beneath the title/percent row.    */
.aura-strip-track {
  position: relative; width: 100%; height: 14px; border-radius: 5px; overflow: hidden;
  background: #0c0816;
  border: 1px solid rgba(232,201,136,.28);
  box-shadow: inset 0 0 0 1px rgba(216,184,255,.15), inset 0 3px 7px rgba(0,0,0,.75), 0 1px 0 rgba(255,255,255,.05);
}
.aura-strip-fill {
  position: relative; height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, var(--accent-deep), var(--accent), var(--accent-bright));
  box-shadow: 0 0 16px rgba(168,85,247,.8), 0 0 4px rgba(255,255,255,.5) inset;
  transition: width .5s cubic-bezier(.16,1,.3,1);
}
.aura-strip-track-shine {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,.3), transparent 55%);
}

/* wraps the track with overflow visible so sparks can burst out past   */
/* the bar's own edges instead of being clipped by the track's rounded  */
/* corners.                                                             */
.aura-strip-track-wrap { position: relative; width: 100%; }
.aura-spark-cluster {
  position: absolute; top: 50%; width: 0; height: 0; pointer-events: none; z-index: 2;
}
.aura-spark-left { left: 0; }
.aura-spark-right { right: 0; }
.aura-spark {
  position: absolute; top: 0; left: 0; width: 3px; height: 3px; border-radius: 50%;
  background: radial-gradient(circle, #fff, rgba(168,85,247,.95) 55%, transparent 75%);
  opacity: 0; transform: translate(-50%, -50%) scale(.3);
}
.aura-spark-right .aura-spark { transform: translate(50%, -50%) scale(.3); }
.aura-strip-pulse .aura-spark-left .aura-spark-1 { animation: auraSparkFireL .9s ease-out .05s; }
.aura-strip-pulse .aura-spark-left .aura-spark-2 { animation: auraSparkFireL2 .8s ease-out .12s; }
.aura-strip-pulse .aura-spark-left .aura-spark-3 { animation: auraSparkFireL3 1s ease-out .2s; }
.aura-strip-pulse .aura-spark-right .aura-spark-1 { animation: auraSparkFireR .9s ease-out .05s; }
.aura-strip-pulse .aura-spark-right .aura-spark-2 { animation: auraSparkFireR2 .8s ease-out .12s; }
.aura-strip-pulse .aura-spark-right .aura-spark-3 { animation: auraSparkFireR3 1s ease-out .2s; }
@keyframes auraSparkFireL {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  20% { opacity: 1; box-shadow: 0 0 6px 2px rgba(168,85,247,.9); }
  100% { opacity: 0; transform: translate(calc(-50% - 22px), calc(-50% - 10px)) scale(.2); }
}
@keyframes auraSparkFireL2 {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  20% { opacity: 1; box-shadow: 0 0 6px 2px rgba(216,184,255,.9); }
  100% { opacity: 0; transform: translate(calc(-50% - 16px), calc(-50% + 12px)) scale(.2); }
}
@keyframes auraSparkFireL3 {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  20% { opacity: 1; box-shadow: 0 0 6px 2px rgba(255,255,255,.9); }
  100% { opacity: 0; transform: translate(calc(-50% - 28px), calc(-50% - 2px)) scale(.2); }
}
@keyframes auraSparkFireR {
  0% { opacity: 0; transform: translate(50%,-50%) scale(.3); }
  20% { opacity: 1; box-shadow: 0 0 6px 2px rgba(168,85,247,.9); }
  100% { opacity: 0; transform: translate(calc(50% + 22px), calc(-50% - 10px)) scale(.2); }
}
@keyframes auraSparkFireR2 {
  0% { opacity: 0; transform: translate(50%,-50%) scale(.3); }
  20% { opacity: 1; box-shadow: 0 0 6px 2px rgba(216,184,255,.9); }
  100% { opacity: 0; transform: translate(calc(50% + 16px), calc(-50% + 12px)) scale(.2); }
}
@keyframes auraSparkFireR3 {
  0% { opacity: 0; transform: translate(50%,-50%) scale(.3); }
  20% { opacity: 1; box-shadow: 0 0 6px 2px rgba(255,255,255,.9); }
  100% { opacity: 0; transform: translate(calc(50% + 28px), calc(-50% - 2px)) scale(.2); }
}

/* icon spark burst - fires outward from the icon's center in six       */
/* directions on check-in, replacing what used to be a glow pulse.      */
.aura-spark-icon { position: absolute; top: 50%; left: 50%; width: 0; height: 0; }
.aura-spark-icon .aura-spark { top: 0; left: 0; transform: translate(-50%, -50%) scale(.3); }
.aura-strip-pulse .aura-spark-icon .aura-spark-1 { animation: auraSparkIcon1 .9s ease-out .02s; }
.aura-strip-pulse .aura-spark-icon .aura-spark-2 { animation: auraSparkIcon2 .95s ease-out .08s; }
.aura-strip-pulse .aura-spark-icon .aura-spark-3 { animation: auraSparkIcon3 .85s ease-out .04s; }
.aura-strip-pulse .aura-spark-icon .aura-spark-4 { animation: auraSparkIcon4 1s ease-out .1s; }
.aura-strip-pulse .aura-spark-icon .aura-spark-5 { animation: auraSparkIcon5 .9s ease-out .06s; }
.aura-strip-pulse .aura-spark-icon .aura-spark-6 { animation: auraSparkIcon6 .8s ease-out .14s; }
@keyframes auraSparkIcon1 {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  22% { opacity: 1; box-shadow: 0 0 7px 2px rgba(168,85,247,.9); }
  100% { opacity: 0; transform: translate(calc(-50% - 46px), calc(-50% - 30px)) scale(.2); }
}
@keyframes auraSparkIcon2 {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  22% { opacity: 1; box-shadow: 0 0 7px 2px rgba(216,184,255,.9); }
  100% { opacity: 0; transform: translate(calc(-50% + 44px), calc(-50% - 34px)) scale(.2); }
}
@keyframes auraSparkIcon3 {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  22% { opacity: 1; box-shadow: 0 0 7px 2px rgba(255,255,255,.9); }
  100% { opacity: 0; transform: translate(calc(-50% - 52px), calc(-50% + 8px)) scale(.2); }
}
@keyframes auraSparkIcon4 {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  22% { opacity: 1; box-shadow: 0 0 7px 2px rgba(168,85,247,.9); }
  100% { opacity: 0; transform: translate(calc(-50% + 50px), calc(-50% + 10px)) scale(.2); }
}
@keyframes auraSparkIcon5 {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  22% { opacity: 1; box-shadow: 0 0 7px 2px rgba(216,184,255,.9); }
  100% { opacity: 0; transform: translate(calc(-50% - 14px), calc(-50% - 50px)) scale(.2); }
}
@keyframes auraSparkIcon6 {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
  22% { opacity: 1; box-shadow: 0 0 7px 2px rgba(255,255,255,.9); }
  100% { opacity: 0; transform: translate(calc(-50% + 16px), calc(-50% + 48px)) scale(.2); }
}

/* ---- aura energy edge fx: a soft, premium aura hugging the banner's */
/* border only - curved SVG flame wisps (bezier curves, no straight    */
/* edges), tiny glowing particles, and a soft blurred glow pooling in  */
/* the corners. Everything lives in the outer few percent of the frame */
/* so the medallion, heading, and track stay clean; screen blend-mode  */
/* melts it into the existing gradient instead of sitting on top like  */
/* a sticker. Motion is slow and smooth throughout - a gentle sway and */
/* breathe rather than a strobe - so it reads as living energy rather  */
/* than decoration placed around a card.                               */
.aura-strip-fx {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  border-radius: inherit; overflow: hidden;
}

/* an extremely subtle pool of blurred light in two selected corners   */
/* only (not all four) - no shape at all, just a wide violet bloom     */
/* under a tighter white-hot core, breathing slowly - clipped by the   */
/* banner's own rounded corner.                                        */
.aura-fx-corner { position: absolute; width: 110px; height: 110px; pointer-events: none; mix-blend-mode: screen; }
.aura-fx-corner::before, .aura-fx-corner::after { content: ""; position: absolute; border-radius: 50%; }
.aura-fx-corner::before {
  width: 78%; height: 78%; filter: blur(16px);
  background: radial-gradient(circle, rgba(168,85,247,.26), rgba(140,70,255,.1) 55%, transparent 75%);
  animation: auraCornerBreathe 5.2s ease-in-out infinite;
}
.aura-fx-corner::after {
  width: 30%; height: 30%; filter: blur(8px);
  background: radial-gradient(circle, rgba(255,255,255,.42), rgba(216,184,255,.22) 50%, transparent 82%);
  animation: auraCornerBreathe 4.4s ease-in-out infinite .4s;
}
.aura-fx-corner-tl { top: -34px; left: -34px; }
.aura-fx-corner-tl::before { top: 26%; left: 26%; }
.aura-fx-corner-tl::after { top: 42%; left: 42%; }
.aura-fx-corner-br { bottom: -34px; right: -34px; }
.aura-fx-corner-br::before { bottom: 26%; right: 26%; }
.aura-fx-corner-br::after { bottom: 42%; right: 42%; }
@keyframes auraCornerBreathe {
  0%, 100% { opacity: .3; transform: scale(.9); }
  50% { opacity: .6; transform: scale(1.06); }
}

/* tiny flame-like flicks rooted directly at the border line - short,  */
/* irregular, organic blobs (asymmetric border-radius, not a geometric */
/* shape) that lick a few pixels and dissolve immediately. Anchored at */
/* the edge so they only ever read as the border sparking, never as a */
/* separate floating shape.                                            */
.aura-fx-flicker {
  position: absolute; pointer-events: none; mix-blend-mode: screen;
  transform-origin: 50% 100%;
  border-radius: 60% 40% 55% 45% / 65% 60% 40% 35%;
  filter: blur(.5px);
  opacity: 0;
  animation: auraFlickerLick ease-out infinite;
}
.aura-fx-flicker-violet { background: linear-gradient(to top, rgba(168,85,247,.85), rgba(168,85,247,0) 85%); box-shadow: 0 0 3px rgba(168,85,247,.5); }
.aura-fx-flicker-white { background: linear-gradient(to top, rgba(251,245,255,.85), rgba(251,245,255,0) 85%); box-shadow: 0 0 3px rgba(232,201,136,.35); }
@keyframes auraFlickerLick {
  0% { opacity: 0; transform: rotate(var(--rot, 0deg)) scaleY(.15); }
  18% { opacity: .8; transform: rotate(var(--rot, 0deg)) scaleY(.7); }
  38% { opacity: .5; transform: rotate(var(--rot, 0deg)) scaleY(1); }
  65% { opacity: .16; }
  100% { opacity: 0; transform: rotate(var(--rot, 0deg)) scaleY(.1); }
}

/* tiny glowing particles and soft sparks drifting near the border -   */
/* a gentle rise-and-fade rather than a jagged flicker.                */
.aura-fx-particle {
  position: absolute; border-radius: 50%; opacity: 0; pointer-events: none;
  mix-blend-mode: screen; animation: auraParticleGlow ease-in-out infinite;
}
.aura-fx-particle-violet {
  background: radial-gradient(circle, #f4e9ff 0%, var(--accent-bright) 45%, var(--accent) 80%, transparent 100%);
  box-shadow: 0 0 6px rgba(168,85,247,.7);
}
.aura-fx-particle-white {
  background: radial-gradient(circle, #ffffff 0%, #fff6de 50%, var(--gold) 85%, transparent 100%);
  box-shadow: 0 0 6px rgba(255,246,222,.65);
}
.aura-fx-particle-ember {
  background: radial-gradient(circle, #fff3d2 0%, #ffc266 40%, #ff8a3d 70%, transparent 100%);
  box-shadow: 0 0 6px rgba(255,140,60,.55);
}
@keyframes auraParticleGlow {
  0%, 100% { opacity: 0; transform: translateY(0) scale(.6); }
  35% { opacity: .85; }
  50% { opacity: 1; transform: translateY(-4px) scale(1); }
  78% { opacity: .45; }
}

/* ---------- 3. journey - royal, still, interactive ---------- */
.journey-section { position: relative; margin: 6px 0 2px; }
.gold-spark-field { position: absolute; inset: -30px; pointer-events: none; overflow: visible; z-index: 0; }
.gold-spark {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, #fff9ec 0%, var(--gold) 45%, transparent 78%);
  box-shadow: 0 0 6px 1px rgba(232,201,136,.5);
}

.journey-panel-wrap {
  position: relative; z-index: 1; border-radius: calc(var(--radius-lg) + 2px); padding: 2px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  transition: transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s ease;
}
.journey-panel-wrap:hover { transform: translateY(-3px); box-shadow: 0 30px 74px rgba(0,0,0,0.55), 0 0 60px rgba(140,70,255,.28); }
.journey-panel-wrap::before {
  content: ''; position: absolute; inset: -70%; z-index: 0;
  background: conic-gradient(from 0deg, transparent 0%, rgba(232,201,136,.5) 8%, rgba(216,184,255,.18) 18%, transparent 32%, transparent 68%, rgba(140,70,255,.4) 82%, transparent 96%);
}
.journey-panel {
  position: relative; z-index: 1;
  background: linear-gradient(165deg, rgba(26,18,11,0.74), rgba(9,6,4,0.92));
  border-radius: var(--radius-lg);
  padding: 26px 18px 18px;
  backdrop-filter: blur(20px);
  overflow: hidden;
}
.journey-panel::before {
  content: ''; position: absolute; top: -40%; left: -20%; width: 140%; height: 90%;
  background: radial-gradient(ellipse at top, rgba(232,201,136,0.16), rgba(168,85,247,0.1) 45%, transparent 70%);
  pointer-events: none;
}
.journey-crest { display: flex; align-items: center; gap: 11px; margin-bottom: 24px; position: relative; z-index: 1; }
.journey-crest-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(168,85,247,.5), transparent); }
.journey-titles-badge {
  display: flex; align-items: center; gap: 7px; flex: none; white-space: nowrap; position: relative; z-index: 1;
  font-size: 12px; font-weight: 700; color: var(--gold);
  background: rgba(232,201,136,0.08); border: 1px solid rgba(232,201,136,0.25);
  padding: 5px 13px 5px 7px; border-radius: 999px;
}
.journey-crown-img {
  width: 32px; height: 32px; object-fit: contain; flex: none;
  filter: drop-shadow(0 0 9px rgba(232,201,136,.55)) drop-shadow(0 2px 5px rgba(0,0,0,.55));
}
.journey-titles-badge-count {
  font-size: 16px; font-weight: 800; color: var(--gold); line-height: 1;
  text-shadow: 0 0 12px rgba(232,201,136,.5);
}
.journey-titles-badge-total { color: var(--t3); font-weight: 600; font-size: 11px; }
.journey-title-main {
  margin: 0; white-space: nowrap; font-size: 12px; font-weight: 700; letter-spacing: .26em; text-transform: uppercase;
  background: linear-gradient(120deg, #f0e6ff 0%, #d8b8ff 40%, #a855f7 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 10px rgba(140,70,255,.5));
}

.journey-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; position: relative; z-index: 1; }
.journey-item {
  position: relative; display: flex; align-items: center; gap: 14px; padding: 12px 8px; border-radius: 12px;
  cursor: pointer; transition: background .2s ease, transform .2s ease;
}
.journey-item:hover { background: rgba(168,85,247,0.08); transform: translateX(2px); }
.journey-emblem-slot { flex: none; width: 92px; height: 88px; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }

/* Achieved ranks - a warm gold under-bloom behind the crest plus a
   green check-seal pinned to its corner, so conquered ranks read as
   "earned" at a glance (mirroring the active rank's Current Rank tag) */
.journey-item-done .journey-emblem-slot::before {
  content: ""; position: absolute; inset: 4px; border-radius: 50%;
  background: radial-gradient(circle, rgba(232,201,136,0.18), transparent 68%);
  pointer-events: none;
}
.journey-achieved-seal {
  position: absolute; right: 2px; bottom: 0; z-index: 3;
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #0e1c14;
  background: linear-gradient(135deg, #8fe6b4, #2f9e63);
  border: 2px solid rgba(5,4,8,0.85);
  box-shadow: 0 0 12px rgba(95,181,131,.6), 0 2px 6px rgba(0,0,0,.45);
}
.journey-achieved-seal svg { width: 13px; height: 13px; }

/* Emblem presentation - the artwork itself never changes; only the    */
/* atmosphere around it (aura, bloom, saturation) marks its state.     */
.rank-emblem-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
.rank-emblem {
  position: relative; z-index: 2; display: block; object-fit: contain;
  transition: filter .4s ease, opacity .4s ease, transform .4s ease;
}

/* No backing shape at all - the glow is a drop-shadow that hugs the    */
/* emblem's own silhouette, colored by rank (purple -> gold) and state. */
.rank-emblem-wrap-locked .rank-emblem {
  filter: grayscale(0.82) saturate(0.55) brightness(0.48) drop-shadow(0 2px 4px rgba(0,0,0,.5));
  opacity: .56;
}
.journey-item:hover .rank-emblem-wrap-locked .rank-emblem {
  filter: grayscale(0.68) saturate(0.65) brightness(0.58) drop-shadow(0 2px 4px rgba(0,0,0,.5));
  opacity: .7;
}
.rank-emblem-wrap-done .rank-emblem {
  filter: drop-shadow(0 2px 8px rgba(0,0,0,.5)) drop-shadow(0 0 12px rgba(232,201,136,.35)) brightness(1.04) saturate(1.06);
}
.rank-emblem-wrap-active .rank-emblem {
  filter:
    drop-shadow(0 4px 16px rgba(0,0,0,.55))
    drop-shadow(0 0 12px var(--glow-strong))
    drop-shadow(0 0 26px var(--glow-soft))
    brightness(1.08) saturate(1.1);
}

/* Embers - current rank only. Small ember particles set at true 60deg   */
/* intervals around the emblem's visual centre, tinted like real fire    */
/* (not the rank's own glow colour, since embers should always read as   */
/* flame) and drifting outward/upward with a flicker, using each point's */
/* own dx/dy direction so they scatter rather than pulse in place.       */
.rank-emblem-embers { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.rank-emblem-embers i {
  position: absolute; width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; border-radius: 50%;
  background: radial-gradient(circle, #fff3d2 0%, #ffc266 30%, #ff8a3d 60%, #ff5722 85%, transparent 100%);
  filter: drop-shadow(0 0 5px rgba(255,110,40,.85));
  opacity: 0;
  animation: emberRise 2.3s ease-in infinite;
}
.rank-emblem-embers i:nth-child(even) {
  width: 3.5px; height: 3.5px; margin: -1.75px 0 0 -1.75px;
  animation-duration: 2.7s;
}
@keyframes emberRise {
  0% { transform: translate(0, 0) scale(0.55); opacity: 0; }
  12% { opacity: 1; }
  55% {
    transform: translate(calc(var(--dx) * 7px), calc(var(--dy) * 7px - 5px)) scale(1);
    opacity: 0.95;
  }
  100% {
    transform: translate(calc(var(--dx) * 15px), calc(var(--dy) * 15px - 16px)) scale(0.3);
    opacity: 0;
  }
}



.journey-text { display: flex; flex-direction: column; }
.journey-title {
  font-family: "Cinzel", Georgia, "Times New Roman", serif;
  font-size: 14.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--t3);
}
.journey-meta { font-size: 10.5px; color: var(--t3); opacity: .65; margin-top: 1px; }
.journey-current-tag {
  align-self: flex-start; font-size: 9px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase;
  color: #1a1024; background: linear-gradient(120deg, #f0e0ff, #a855f7); padding: 2px 8px; border-radius: 999px;
  margin-bottom: 4px; box-shadow: 0 0 12px rgba(168,85,247,.55);
}

.journey-done .journey-title { color: var(--t2); }

.journey-active .journey-title { color: var(--t1); font-size: 15.5px; letter-spacing: .12em; text-shadow: 0 0 14px rgba(168,85,247,.5); }
.journey-active .journey-meta { color: var(--accent-bright); opacity: 1; }

/* ---------- 4. overall stats - demoted, grouped at the very end ---------- */
.bottom-stats-eyebrow { margin: 0 2px 14px; }
.bottom-stats { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 14px; }
.bottom-stat { padding: 16px 18px; display: flex; flex-direction: column; gap: 5px; }
.bottom-stat-label { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--t3); }
.bottom-stat-value { font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.bottom-stat-value-sub { font-size: 12px; color: var(--t3); font-weight: 600; }
.bottom-stat-sub { font-size: 10px; color: var(--t3); margin-top: 1px; }
.bottom-stat-bar-track { height: 4px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; margin: 2px 0; }
.bottom-stat-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--accent-deep), var(--accent)); }
.bottom-stat-streak { flex-direction: column; align-items: center; text-align: center; gap: 6px; }
.bottom-stat-streak-head { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.bottom-stat-streak-head .bottom-stat-value { justify-content: center; }
.bottom-stat-streak-logo { width: 110px; height: 110px; object-fit: contain; flex: none; margin-top: 8px; filter: drop-shadow(0 0 4px rgba(110,70,255,.5)) drop-shadow(0 0 1px rgba(255,255,255,.3)); }
.bottom-stat-xp { align-items: center; text-align: center; }
.bottom-stat-xp .xp-icon {
  margin: 0; vertical-align: initial;
  filter: drop-shadow(0 0 8px rgba(139,92,246,.6));
}
.bottom-stat-xp-icon-big {
  margin-top: 18px; align-self: center;
  filter: drop-shadow(0 0 14px rgba(139,92,246,.75)) drop-shadow(0 0 4px rgba(255,255,255,.4));
}

/* the level card is the hero of this section - everything else here is supporting detail */
.bottom-stat-level {
  position: relative; overflow: hidden; padding: 20px 22px 18px; gap: 7px;
  border-color: rgba(216,184,255,0.26);
  box-shadow: 0 20px 55px rgba(0,0,0,0.5), 0 0 0 1px rgba(190,150,255,0.05), 0 0 58px rgba(140,70,255,0.16);
}
.bottom-stat-level::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 8% -10%, rgba(168,85,247,0.2), transparent 60%);
}
.bottom-stat-level-head { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
.bottom-stat-level-pct {
  font-size: 11.5px; font-weight: 800; color: var(--accent-bright);
  background: rgba(168,85,247,0.14); border: 1px solid rgba(168,85,247,0.32);
  padding: 3px 9px; border-radius: 999px; text-shadow: 0 0 10px rgba(168,85,247,.5);
}
.bottom-stat-value-hero {
  font-size: 42px; font-weight: 800; line-height: 1; letter-spacing: -.01em; position: relative; z-index: 1;
  background: linear-gradient(120deg, #f4eeff 0%, #d8b8ff 45%, #a855f7 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 18px rgba(140,70,255,.4));
}
.bottom-stat-bar-track-lg { height: 7px; margin: 6px 0 2px; position: relative; z-index: 1; }
.bottom-stat-level .bottom-stat-sub { position: relative; z-index: 1; font-size: 11px; }
.bottom-stat-shields { align-items: center; text-align: center; }
.bottom-stat-shields .bottom-stat-value-hero { position: relative; z-index: 1; }
.bottom-stat-shields-icon {
  margin-top: 12px; position: relative; z-index: 1;
  filter: drop-shadow(0 0 16px rgba(140,70,255,.55)) drop-shadow(0 0 4px rgba(255,255,255,.35));
}

/* ---------- pending review banner ---------- */
.review-banner {
  display: inline-flex; align-self: center; align-items: center; gap: 9px; width: auto; max-width: min(560px, calc(100% - 64px)); text-align: left;
  margin: 18px auto 16px; padding: 7px 8px 7px 16px; border-radius: 999px; border: none; cursor: pointer;
  background: linear-gradient(90deg, rgba(232,171,79,0.13), rgba(140,70,255,0.1));
  border: 1px solid rgba(232,171,79,0.3);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.15) inset, 0 6px 16px rgba(0,0,0,0.22);
  overflow: hidden; transition: box-shadow .15s ease, border-color .15s ease;
}
.review-banner:hover { border-color: rgba(232,171,79,0.55); box-shadow: 0 0 18px rgba(232,171,79,.22), 0 6px 16px rgba(0,0,0,0.22); }
.review-banner-icon { flex: none; display: flex; align-items: center; animation: pendingPulse 1.8s ease-in-out infinite; }
.review-banner-track { flex: none; width: 300px; overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
.review-banner-marquee { display: inline-flex; white-space: nowrap; animation: marqueeScroll 18s linear infinite; }
.review-banner-text {
  display: inline-block; padding-right: 64px;
  font-family: "Cinzel", Georgia, "Times New Roman", serif;
  font-size: 11.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  background: linear-gradient(180deg, #fff3d6 0%, #f0c877 42%, #c8922f 58%, #ffe9b8 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 1px 0 rgba(0,0,0,.35);
  filter: drop-shadow(0 0 4px rgba(232,171,79,.35));
}
.review-banner-cta {
  flex: none; font-family: "Cinzel", Georgia, serif; font-size: 10px; font-weight: 800;
  letter-spacing: .06em; text-transform: uppercase;
  color: #1a1024; background: linear-gradient(135deg, #ffe1a0, #e8ab4f); padding: 5px 13px; border-radius: 999px;
}
@keyframes marqueeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes pendingPulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }

/* ---------- habit detail dialog ---------- */
.detail-dialog {
  width: min(640px, 100%); max-height: 86vh; overflow-y: auto;
  background: rgba(16,11,28,0.96); border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg); padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 50px rgba(140,70,255,.25);
  backdrop-filter: blur(20px); animation: dialogIn .18s cubic-bezier(.16,1,.3,1);
}
.detail-dialog-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.detail-dialog-head-text { display: flex; flex-direction: column; gap: 4px; }
.detail-dialog-title { margin: 0; font-size: 18px; }
.detail-close-btn { flex: none; }
.diff-text-easy { color: var(--green); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.diff-text-medium { color: var(--gold); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.diff-text-hard { color: var(--red-muted); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }

.detail-pending-callout {
  display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 14px; padding: 9px 14px;
  border-radius: 12px; border: 1px solid rgba(232,171,79,0.4); background: rgba(232,171,79,0.1);
  color: #f0bd72; font-size: 12px; font-weight: 600; cursor: pointer; text-align: left;
  transition: background .15s ease;
}
.detail-pending-callout:hover { background: rgba(232,171,79,0.18); }
.detail-pending-callout-cta { margin-left: auto; font-weight: 800; }

.detail-dialog-body { display: grid; grid-template-columns: 208px 1fr; gap: 20px; margin-top: 18px; }

.detail-legend { display: flex; flex-direction: column; gap: 16px; }
.detail-stat-row { display: flex; gap: 10px; }
.detail-streak-row { margin-top: 10px; }
.detail-stat {
  flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--border);
}
.detail-stat-value { font-size: 18px; font-weight: 800; color: var(--t1); }
.detail-stat-value-sub { font-size: 11px; font-weight: 600; color: var(--t3); }
.detail-stat-label { font-size: 10px; color: var(--t3); letter-spacing: .03em; text-transform: uppercase; }

.detail-legend-heading {
  display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11px; font-weight: 700;
  color: var(--t2); letter-spacing: .04em; text-transform: uppercase;
}
.detail-legend-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.detail-legend-item { display: flex; align-items: flex-start; gap: 9px; }
.detail-legend-text { display: flex; flex-direction: column; gap: 2px; }
.detail-legend-label { font-size: 12px; font-weight: 700; color: var(--t1); }
.detail-legend-copy { font-size: 11px; color: var(--t3); line-height: 1.4; }

.legend-dot { flex: none; width: 12px; height: 12px; border-radius: 50%; margin-top: 2px; }
.legend-dot-done { background: var(--green); box-shadow: 0 0 8px rgba(80,210,140,.5); }
.legend-dot-shielded { background: var(--gold); box-shadow: 0 0 8px rgba(232,201,136,.5); }
.legend-dot-missed { background: var(--red-muted); box-shadow: 0 0 8px rgba(210,90,90,.4); }
.legend-dot-pending { background: transparent; border: 2px dashed #e8ab4f; }

.detail-calendar-column { min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.detail-calendar { min-width: 0; }
.detail-calendar-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.detail-cal-nav-btn { color: var(--t2); }
.detail-cal-nav-btn:disabled { opacity: .3; cursor: default; }
.detail-calendar-month { font-size: 13px; font-weight: 700; color: var(--t1); }
.detail-calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
.detail-calendar-weekdays span { text-align: center; font-size: 10px; color: var(--t3); font-weight: 700; }
.detail-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 6px; }

.detail-day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center; margin: 0 auto;
  width: 30px; height: 30px; border-radius: 50%; font-size: 11px; font-weight: 600; color: var(--t2);
  border: 1.5px solid transparent; background: transparent; cursor: default; padding: 0;
}
.detail-day-empty { visibility: hidden; }
.detail-day-neutral { color: var(--t3); }
.detail-day-future { color: var(--t3); opacity: .35; }
.detail-day-done { background: rgba(80,210,140,0.16); border-color: var(--green); color: #bdf0d4; }
.detail-day-shielded { background: rgba(232,201,136,0.16); border-color: var(--gold); color: #f5e6bc; }
.detail-day-missed { background: rgba(210,90,90,0.14); border-color: var(--red-muted); color: #f0c4c4; }
.detail-day-pending {
  border: 1.5px dashed #e8ab4f; color: #f0bd72; cursor: pointer; animation: pendingRing 2s ease-in-out infinite;
}
.detail-day-pending:hover { background: rgba(232,171,79,0.16); }
.detail-day-today { box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
.detail-day-num { pointer-events: none; }
button.detail-day { cursor: pointer; }
button.detail-day:hover { filter: brightness(1.18); }
.detail-day-selected { box-shadow: 0 0 0 2px #fff, 0 0 14px rgba(255,255,255,.35) !important; }
@keyframes pendingRing { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,171,79,.35); } 50% { box-shadow: 0 0 0 4px rgba(232,171,79,0); } }

/* ---------- gem-styled status text (Cinzel, engraved gradient fill) ---------- */
.gem-text {
  margin: 0 0 6px; font-family: "Cinzel", Georgia, "Times New Roman", serif;
  font-size: 15px; font-weight: 700; letter-spacing: .04em;
  text-shadow: 0 1px 0 rgba(0,0,0,.4);
}
.gem-text-success {
  background: linear-gradient(180deg, #d9ffe9 0%, #7fe3ab 45%, #2f9e63 60%, #bdf7d6 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 5px rgba(95,181,131,.4));
}
.gem-text-shielded {
  background: linear-gradient(180deg, #fff3d6 0%, #f0c877 42%, #c8922f 58%, #ffe9b8 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 5px rgba(232,171,79,.4));
}
.gem-text-missed {
  background: linear-gradient(180deg, #ffd9d3 0%, #e8897d 45%, #a3453d 60%, #f5c2ba 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 5px rgba(193,97,90,.4));
}

/* ---------- day detail panel ---------- */
.day-detail-panel {
  border-radius: 14px; border: 1px solid var(--border-strong); background: rgba(255,255,255,0.03);
  padding: 14px 16px; animation: dialogIn .16s cubic-bezier(.16,1,.3,1);
}
.day-detail-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.day-detail-date { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--t3); }
.day-detail-body { margin: 0 0 10px; font-size: 12.5px; color: var(--t2); line-height: 1.5; }
.day-detail-action { padding: 8px 14px; font-size: 12px; }
.day-detail-confirm { border-top: 1px solid var(--border); padding-top: 10px; margin-top: 4px; }
.day-detail-confirm-text { margin: 0 0 10px; font-size: 12px; color: var(--t2); }
.day-detail-confirm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.day-detail-confirm-actions .btn { padding: 8px 14px; font-size: 12px; }

/* ---------- review session dialog ---------- */
.review-dialog {
  width: min(380px, 100%); background: rgba(16,11,28,0.96); border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg); padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 50px rgba(140,70,255,.25);
  backdrop-filter: blur(20px); animation: dialogIn .18s cubic-bezier(.16,1,.3,1);
}
.review-dialog-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.review-dialog-progress { font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--t3); }
.review-dialog-eyebrow { margin: 0 0 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #e8ab4f; }
.review-dialog-title { margin: 0 0 4px; font-size: 18px; }
.review-dialog-date { margin: 0 0 12px; font-size: 12px; color: var(--t3); }
.review-dialog-body { margin: 0 0 20px; font-size: 12.5px; color: var(--t2); line-height: 1.5; }
.review-dialog-actions { display: flex; flex-direction: column; gap: 10px; }
.review-dialog-rate-limit { margin: 12px 0 0; font-size: 11px; font-weight: 600; color: var(--red-muted); text-align: center; }
.btn-review { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; font-size: 12.5px; }
.btn-review-recover { background: linear-gradient(135deg, #6fe0a0, #2f9e63); color: #0e1c14; }
.btn-review-recover:hover { filter: brightness(1.06); }
.btn-review-miss { background: rgba(255,255,255,0.05); border: 1px solid var(--border-strong); color: var(--t1); }
.btn-review-miss:hover { border-color: var(--red-muted); color: #f0c4c4; }
.btn-review-shield { background: linear-gradient(135deg, #ffe1a0, #d4a017); color: #241a05; }
.btn-review-shield:hover { filter: brightness(1.06); }

/* Shield-confirm step reads as a distinct "final decision" beat -
 * warmer glow on the dialog itself, a pulsing waiting-ring icon, and
 * a slightly emphasized primary action - so it doesn't blur together
 * with the two steps that led up to it. */
.review-dialog-confirm {
  border-color: rgba(232,201,136,0.5);
  animation: dialogIn .18s cubic-bezier(.16,1,.3,1), reviewConfirmDialogGlow 2.4s ease-in-out infinite;
}
@keyframes reviewConfirmDialogGlow {
  0%, 100% { box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(232,201,136,.22); }
  50% { box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 66px rgba(232,201,136,.42); }
}
.review-confirm-icon {
  position: relative; width: 104px; height: 104px; margin: 2px auto 14px;
  display: flex; align-items: center; justify-content: center; color: var(--gold);
}
.review-confirm-icon-core {
  position: relative; z-index: 1; width: 84px; height: 84px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 32% 26%, #4a3a1a, #241a05 70%);
  border: 1px solid rgba(232,201,136,0.55);
  filter: drop-shadow(0 0 8px rgba(232,201,136,.55));
}
.review-confirm-ring {
  position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid rgba(232,201,136,0.5);
  animation: reviewConfirmRing 1.8s ease-out infinite;
}
.review-confirm-ring-delay { animation-delay: 0.9s; }
@keyframes reviewConfirmRing {
  0% { transform: scale(0.55); opacity: 0.9; }
  100% { transform: scale(1.7); opacity: 0; }
}
.review-dialog-eyebrow-confirm { color: var(--gold); text-align: center; }
.review-dialog-title-confirm { text-align: center; }
.review-dialog-confirm .review-dialog-date { text-align: center; }
.review-dialog-confirm .review-dialog-body { text-align: center; }
.btn-review-confirm {
  position: relative; animation: reviewConfirmBtnPulse 2.4s ease-in-out infinite;
}
@keyframes reviewConfirmBtnPulse {
  0%, 100% { box-shadow: 0 0 0 rgba(232,201,136,0); }
  50% { box-shadow: 0 0 18px rgba(232,201,136,.6); }
}

/* ---------- edit habit dialog ---------- */
.edit-dialog {
  width: min(400px, 100%); background: rgba(16,11,28,0.96); border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg); padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 50px rgba(140,70,255,.25);
  backdrop-filter: blur(20px); animation: dialogIn .18s cubic-bezier(.16,1,.3,1);
}
.edit-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
.edit-field-label { font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--t3); }
.edit-field-input {
  width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-strong);
  background: rgba(255,255,255,0.04); color: var(--t1); font-size: 13.5px; font-family: inherit;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.edit-field-input:focus { outline: none; border-color: var(--accent-bright); box-shadow: 0 0 0 3px rgba(168,85,247,.2); }
/* Chrome/Safari paint autofilled password fields white, force the dark theme back */
.edit-field-input:-webkit-autofill,
.edit-field-input:-webkit-autofill:hover,
.edit-field-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #1a1526 inset;
  -webkit-text-fill-color: var(--t1);
  caret-color: var(--t1);
  border-color: var(--border-strong);
  transition: background-color 99999s ease-in-out 0s;
}
.edit-field-input-error { border-color: var(--red-muted); }
.edit-field-error { font-size: 11px; color: #e2897f; }
.account-select {
  appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 34px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238a8398' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
}
.account-select option { background: #1a1526; color: var(--t1); }
.add-habit-intro { margin: 0 0 18px; font-size: 12.5px; color: var(--t3); line-height: 1.5; }
.habit-limit-info { margin: 0 0 14px; font-size: 11px; font-weight: 600; color: var(--gold); text-align: center; }
.habit-limit-info.at-limit { color: var(--red-muted); }
.btn-disabled { opacity: .45; cursor: default; filter: none !important; }
.btn-disabled:hover { filter: none !important; transform: none !important; box-shadow: none !important; }
.edit-diff-options { display: flex; gap: 8px; }
.edit-diff-option {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 6px;
  border-radius: 10px; border: 1.5px solid var(--border-strong); background: rgba(255,255,255,0.03);
  color: var(--t2); font-size: 12px; font-weight: 700; transition: border-color .15s ease, background .15s ease, color .15s ease;
}
.edit-diff-option-xp, .edit-diff-xp { font-size: 10px; font-weight: 600; color: var(--t3); }
.edit-diff-option.diff-edge-easy.edit-diff-option-active { border-color: var(--green); background: rgba(95,181,131,0.14); color: #bdf0d4; }
.edit-diff-option.diff-edge-medium.edit-diff-option-active { border-color: var(--violet-muted); background: rgba(157,138,214,0.16); color: #ded4f7; }
.edit-diff-option.diff-edge-hard.edit-diff-option-active { border-color: var(--red-muted); background: rgba(193,97,90,0.14); color: #f0c4c4; }
.edit-diff-option-active .edit-diff-xp { color: inherit; opacity: .8; }
/* Read-only difficulty display in the edit dialog - the backend fixes
   difficulty at creation, so it is shown, not chosen. */
.edit-field-hint { text-transform: none; letter-spacing: 0; font-weight: 500; opacity: .75; }
.edit-diff-fixed { display: inline-block; font-size: 12.5px; font-weight: 700; padding: 8px 0; }
.edit-dialog-actions { margin-top: 18px; }
.edit-confirm-summary { list-style: none; margin: 0 0 18px; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); font-size: 12.5px; color: var(--t2); line-height: 1.8; }
.edit-confirm-summary strong { color: var(--t1); }

/* ---------- confirm dialog ---------- */
.confirm-dialog {
  width: min(320px, 100%); background: rgba(16,11,28,0.94); border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg); padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 50px rgba(140,70,255,.25);
  backdrop-filter: blur(20px);
  animation: dialogIn .18s cubic-bezier(.16,1,.3,1);
}
@keyframes dialogIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
.confirm-title { margin: 0 0 8px; font-size: 16px; }
.confirm-body { margin: 0 0 20px; font-size: 12.5px; color: var(--t2); line-height: 1.5; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { border: none; border-radius: 999px; padding: 9px 16px; font-size: 12.5px; font-weight: 600; }
.btn:disabled { opacity: .4; cursor: default; filter: none; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--t2); }
.btn-ghost:hover { color: var(--t1); border-color: var(--border-strong); }
.btn-danger { background: linear-gradient(135deg, #c1615a, #7a2b26); color: #fff; }
.btn-danger:hover { filter: brightness(1.08); }
/* every modal is capped to the real viewport and scrolls internally, so
   long content is always reachable on small screens (dvh tracks mobile
   browser chrome; the vh line is the fallback for old browsers) */
.detail-dialog, .edit-dialog, .review-dialog, .profile-dialog, .confirm-dialog {
  max-width: 100%;
  max-height: 86vh; max-height: 86dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* ---------- toast ---------- */
.toast {
  position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%);
  background: rgba(16,11,28,0.94); border: 1px solid var(--border-strong); color: var(--t1);
  font-size: 12.5px; padding: 10px 18px; border-radius: 999px; z-index: 60;
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 34px rgba(0,0,0,0.5), 0 0 26px rgba(140,70,255,.3); animation: toastIn .2s ease;
}
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ---------- character card (mobile only) ---------- */
.character-card {
  display: none;
  position: relative; width: 100%; height: 280px; border-radius: var(--radius-lg);
  overflow: hidden; background: var(--bg); border: 1px solid var(--border);
  box-shadow: 0 16px 40px rgba(0,0,0,0.45);
}
.character-card-img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 32% 18%;
  animation: heroImgIn 1.4s cubic-bezier(.16,1,.3,1) both;
}
.character-card-img-incoming { opacity: 0; animation: sceneFade 1.1s ease forwards; }
.character-card-shade {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(5,4,8,0) 55%, rgba(5,4,8,0.75) 100%),
              linear-gradient(0deg, rgba(5,4,8,0.25) 0%, rgba(5,4,8,0) 22%);
}

/* ---------- bottom tab bar (mobile only) ---------- */
.bottom-nav {
  display: none;
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  padding: 8px 6px calc(8px + env(safe-area-inset-bottom, 0px));
  background: rgba(10, 7, 18, 0.95); backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-strong);
  box-shadow: 0 -12px 34px rgba(0,0,0,0.4);
  justify-content: space-around; align-items: center;
}
.bottom-nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: transparent; border: none;
  color: rgba(248,246,252,0.72);
  font-size: 10px; font-weight: 700; letter-spacing: .02em; padding: 6px 12px; border-radius: 12px;
  transition: color .18s ease;
}
.bottom-nav-item-active { color: var(--accent-bright); }
.bottom-nav-item-active svg { filter: drop-shadow(0 0 6px rgba(168,85,247,.7)); }

/* ---------- responsive ---------- */
/* Below 900px the character stops being a full-bleed page background
   (too easy to end up with "two backgrounds") and instead becomes a
   normal rounded card at the top of a single scrolling page, styled
   like a native mobile app: compact header, scrollable content, fixed
   bottom tab bar for primary navigation. */
@media (max-width: 900px) {
  .bg-layer { display: none; }
  .character-card { display: block; }
  .bottom-nav { display: flex; }

  .content-wrap { padding: 18px 5vw calc(96px + env(safe-area-inset-bottom, 0px)) 5vw; }
  .content-stack { max-width: 620px; margin: 0 auto; gap: 18px; }

  .detail-dialog-body { grid-template-columns: 1fr; }
  .detail-legend { flex-direction: row; flex-wrap: wrap; }
  .detail-stat-row { width: 100%; }
  .detail-legend-list { flex-direction: row; flex-wrap: wrap; gap: 10px 16px; width: 100%; }
  .detail-legend-item { flex: 1 1 130px; }

  .aura-strip-medallion { width: 84px; height: 84px; }
  .aura-strip-icon-img { width: 84px; height: 84px; transform: scale(1.55); }
  .aura-spark-icon { transform: scale(.8); }
  .aura-spark-left, .aura-spark-right { transform: scale(.85); }
  .aura-strip-title { font-size: 20px; }
}
@media (max-width: 640px) {
  .topbar { padding: 16px 16px; gap: 10px; }
  .topbar-left { gap: 10px; min-width: 0; flex: 1 1 auto; }
  .logo { min-width: 0; }
  .brand-mark { height: 30px; }
  .brand-mark-img { height: 30px; max-width: 100%; }
  .profile-block { flex: none; gap: 0; padding: 4px; }
  .profile-text { display: none; }
  .character-card { height: 240px; }
  .content-wrap { padding: 16px 5vw calc(90px + env(safe-area-inset-bottom, 0px)) 5vw; }
  .bottom-stats { grid-template-columns: 1fr; }

  /* habits panel - on phones the name/streak/difficulty text stacks as
     tidy lines under the habit name, and the menu dots top-align with
     the first line instead of floating mid-row beside wrapped text */
  .habits-panel { padding: 18px 14px; }
  .panel-header { gap: 10px; }
  .add-habit-btn { flex: none; padding: 8px 14px; font-size: 11.5px; }

  .habit-list { gap: 8px; }
  .habit-row { align-items: flex-start; gap: 11px; padding: 12px 6px 12px 13px; }
  .habit-check { margin-top: 1px; }
  .habit-top { flex-direction: column; align-items: flex-start; gap: 6px; margin-bottom: 0; }
  .habit-name { white-space: normal; overflow-wrap: break-word; line-height: 1.35; }
  .habit-top-meta { gap: 8px; }
  .habit-menu-wrap { margin: -3px -3px 0 0; }
  .habit-menu-btn { width: 34px; height: 34px; }
  .aura-strip { width: 100%; padding: 9px 14px; gap: 11px; }
  .aura-strip-content { gap: 5px; }
  .aura-strip-medallion { width: 44px; height: 44px; }
  .aura-strip-icon-img { width: 44px; height: 44px; transform: scale(1.2); }
  .aura-spark-icon { transform: scale(.55); }
  .aura-spark-left, .aura-spark-right { transform: scale(.6); }
  .aura-strip-glow { left: 36px; top: 50%; width: 84px; height: 84px; }
  .aura-strip-title { font-size: 14.5px; letter-spacing: .06em; }
  .aura-strip-percent { font-size: 12.5px; }
  .aura-strip-track { flex: 1; height: 9px; border-radius: 4px; }
  .bottom-nav-item span { font-size: 10px; text-shadow: 0 1px 3px rgba(0,0,0,0.9); }

  .review-banner { margin: 14px auto 14px; max-width: calc(100% - 10vw); padding: 6px 6px 6px 13px; gap: 7px; }
  .review-banner-track { width: 170px; }
  .review-banner-text { font-size: 10px; padding-right: 48px; }
  .review-banner-cta { font-size: 9px; padding: 5px 11px; }

  .detail-dialog { padding: 16px; max-height: 90vh; }
  .detail-dialog-title { font-size: 16px; }
  .detail-dialog-body { gap: 16px; margin-top: 14px; }
  .detail-legend-list { flex-direction: column; }
  .detail-legend-item { flex: none; }
  .detail-day { width: 26px; height: 26px; font-size: 10px; }

  .review-dialog { padding: 18px; }
  .review-dialog-actions { gap: 8px; }
  .btn-review { padding: 12px 14px; }

  /* modals: tighter chrome, near-full width, comfortable touch targets */
  .overlay-center { padding: 10px; }
  .detail-dialog, .edit-dialog, .review-dialog, .profile-dialog, .confirm-dialog {
    border-radius: var(--radius-md);
    padding: 18px 16px;
  }
  /* 16px+ stops iOS Safari auto-zooming the page when an input is focused */
  .edit-field-input, .account-select { font-size: 16px; }
  .edit-diff-option { padding: 11px 6px; }
  .btn-review, .confirm-actions .btn, .edit-dialog-actions .btn, .confirm-actions-btn { min-height: 44px; }
}

/* ---------- my account page (full page, not a modal) ---------- */
.account-page {
  position: relative; min-height: 100vh; width: 100%;
  display: flex; flex-direction: column;
  isolation: isolate;
}
.account-page::before {
  content: ""; position: fixed; inset: 0; z-index: -1;
  background:
    radial-gradient(120% 70% at 50% -10%, rgba(168,85,247,0.12), transparent 55%),
    radial-gradient(45% 90% at 0% 50%, rgba(200,180,230,0.14), transparent 65%),
    radial-gradient(45% 90% at 100% 50%, rgba(200,180,230,0.14), transparent 65%),
    linear-gradient(rgba(5,4,8,0.42), rgba(5,4,8,0.6)),
    url('/assets/account-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.account-page-header {
  position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  background: linear-gradient(rgba(5,4,8,0.32), rgba(5,4,8,0.08));
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.account-page-header-left { display: flex; align-items: center; gap: 10px; z-index: 1; }
.account-page-back { flex: none; }
.account-page-title {
  margin: 0; font-size: 21px; color: var(--t1); letter-spacing: .04em;
}
@media (max-width: 640px) {
  .account-page-title { font-size: 18px; }
}
.account-page-body { flex: 1; width: 100%; max-width: 520px; margin: 0 auto; padding: 24px 20px 60px; box-sizing: border-box; }
/* gamified entrance - panels rise into place one by one */
@keyframes accountPanelIn {
  from { opacity: 0; transform: translateY(16px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.account-page-body > * { animation: accountPanelIn .55s cubic-bezier(.16,1,.3,1) both; }
.account-page-body > *:nth-child(1) { animation-delay: .04s; }
.account-page-body > *:nth-child(2) { animation-delay: .12s; }
.account-page-body > *:nth-child(3) { animation-delay: .2s; }
.account-page-body > *:nth-child(4) { animation-delay: .28s; }
@media (prefers-reduced-motion: reduce) {
  .account-page-body > * { animation: none; }
}

.account-info-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
.account-info-item {
  display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--border);
}
.account-info-label { font-size: 10px; color: var(--t3); letter-spacing: .03em; text-transform: uppercase; }
.account-info-value { font-size: 12.5px; font-weight: 700; color: var(--t1); overflow-wrap: anywhere; }

.account-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
.account-section-title { margin: 0 0 14px; font-size: 12.5px; font-weight: 700; letter-spacing: .03em; color: var(--t1); }

.account-tz-suggestion {
  margin: 0 0 14px; padding: 12px 14px; border-radius: 10px;
  background: rgba(255, 200, 87, 0.08); border: 1px solid rgba(255, 200, 87, 0.28);
  font-size: 12.5px; color: var(--t2); line-height: 1.5;
}
.account-tz-suggestion-actions { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.account-tz-suggestion-actions .btn-primary { width: auto; padding: 8px 14px; min-height: 36px; }
.account-tz-suggestion-actions .btn.btn-ghost { min-height: 36px; padding: 8px 14px; }

.account-password-input-wrap { position: relative; }
.account-password-input-wrap .edit-field-input {
  padding-right: 38px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--t1); letter-spacing: 0.5px;
}
.account-password-toggle {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center; border-radius: 8px; color: var(--t3);
  background: transparent; transition: color .15s ease, background .15s ease;
}
.account-password-toggle:hover { color: var(--t1); background: rgba(255,255,255,0.06); }
.account-password-row { display: flex; justify-content: flex-end; margin: -6px 0 14px; }
.account-forgot-link { font-size: 11.5px; font-weight: 600; color: var(--accent-bright); background: none; border: none; }
.account-forgot-link:hover { text-decoration: underline; }
.account-success-msg { margin: -4px 0 14px; font-size: 12px; color: #8fd6ac; font-weight: 600; }
.account-tz-unconfirmed-note { margin: -4px 0 14px; font-size: 11.5px; color: var(--t3); }

.btn-primary {
  position: relative; overflow: hidden;
  background: linear-gradient(120deg, var(--accent-bright) 0%, var(--accent) 45%, var(--accent-deep) 100%); color: #180a2c;
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 16px; font-size: 12.5px;
  font-weight: 700; letter-spacing: .04em;
  box-shadow: 0 0 20px rgba(168,85,247,.35), inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.18);
  transition: transform .18s cubic-bezier(.16,1,.3,1), box-shadow .25s ease, filter .2s ease;
}
/* light-sweep sheen that slides across the button on hover/touch */
.btn-primary::after {
  content: ""; position: absolute; top: -40%; bottom: -40%; left: -75%; width: 45%;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,.55), transparent);
  transform: skewX(-22deg); pointer-events: none;
  transition: left .55s cubic-bezier(.22,1,.36,1);
}
.btn-primary:hover {
  transform: translateY(-2px);
  filter: brightness(1.07);
  box-shadow: 0 8px 26px rgba(0,0,0,.4), 0 0 34px rgba(168,85,247,.6), inset 0 1px 0 rgba(255,255,255,.55);
}
.btn-primary:hover::after { left: 130%; }
.btn-primary:active {
  transform: translateY(0) scale(.97); transition-duration: .08s;
  box-shadow: 0 0 14px rgba(168,85,247,.45), inset 0 1px 0 rgba(255,255,255,.35);
}
.confirm-actions .btn-primary { width: auto; }
@media (prefers-reduced-motion: reduce) {
  .btn-primary, .btn-primary::after { transition: none; }
  .btn-primary:hover { transform: none; }
  .btn-primary::after { display: none; }
}

.account-danger-section { border-top-color: rgba(193,97,90,0.3); }
.account-danger-title { color: #e2897f; }
.account-danger-copy {
  margin: 0 0 16px;
  font-size: 13.5px; font-weight: 700; color: var(--t1); line-height: 1.7;
}
.account-danger-copy-strong { color: #ffc9c1; font-weight: 800; letter-spacing: .01em; }
.account-delete-btn {
  width: 100%; border-color: rgba(122,43,38,0.65); color: #cf9a92;
  background: linear-gradient(135deg, rgba(58,22,20,0.85), rgba(40,14,12,0.9));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease, color .18s ease;
}
.account-delete-btn:hover {
  border-color: rgba(193,97,90,0.8); color: #e8b3ab;
  background: linear-gradient(135deg, rgba(84,30,27,0.9), rgba(56,18,16,0.95));
  box-shadow: 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07);
}
.account-delete-btn:active { transform: scale(.98); }

.confirm-warning-icon { display: flex; justify-content: center; margin-bottom: 10px; }

/* ---------- logged out / check-email / reset password screens ---------- */
.logged-out-screen {
  position: relative; isolation: isolate;
  min-height: 100vh; min-height: 100dvh;
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
/* same cinematic backdrop as the account page - a flat near-black fill
   read as dead black bars on either side of the centered card */
.logged-out-screen::before {
  content: ""; position: fixed; inset: 0; z-index: -1;
  background:
    radial-gradient(120% 70% at 50% -10%, rgba(168,85,247,0.12), transparent 55%),
    radial-gradient(45% 90% at 0% 50%, rgba(200,180,230,0.14), transparent 65%),
    radial-gradient(45% 90% at 100% 50%, rgba(200,180,230,0.14), transparent 65%),
    linear-gradient(rgba(5,4,8,0.42), rgba(5,4,8,0.6)),
    url('/assets/account-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.logged-out-card {
  width: 360px; max-width: 100%; text-align: center; padding: 34px 26px;
  background: rgba(16,11,28,0.9); border: 1px solid var(--border-strong); border-radius: var(--radius-lg);
  box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 50px rgba(140,70,255,.22); backdrop-filter: blur(20px);
}
.logged-out-badge {
  display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%;
  margin-bottom: 16px; color: #f0e0ff;
  background: radial-gradient(circle at 32% 26%, #4a2a86, var(--accent-deep) 55%, #1c0f38 100%);
  border: 1px solid var(--border-strong); box-shadow: 0 0 24px rgba(168,85,247,.4);
}
.logged-out-title { margin: 0 0 8px; font-size: 18px; color: var(--t1); }
.logged-out-body { margin: 0 0 22px; font-size: 12.5px; color: var(--t2); line-height: 1.6; }
.logged-out-btn { width: 100%; }
.check-email-back-btn { width: 100%; margin-top: 10px; }
.reset-pw-card { width: 380px; }
.reset-pw-form { display: flex; flex-direction: column; gap: 2px; text-align: left; margin-top: 4px; }
.reset-pw-form .logged-out-btn { margin-top: 8px; }

@media (max-width: 480px) {
  .account-page-header { padding: 14px 16px; }
  .account-page-body { padding: 18px 16px 48px; }
  .account-info-grid { grid-template-columns: 1fr; }
}

/* ---------- profile dialog ---------- */
.profile-dialog {
  width: min(400px, 100%); max-height: 86vh; overflow-y: auto;
  background: radial-gradient(120% 140% at 50% -10%, rgba(168,85,247,0.16), transparent 55%), rgba(16,11,28,0.97);
  border: 1px solid var(--border-strong); border-radius: var(--radius-lg); padding: 22px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 60px rgba(140,70,255,.28);
  backdrop-filter: blur(20px); animation: dialogIn .18s cubic-bezier(.16,1,.3,1);
}
.profile-dialog-hero {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 8px; margin-top: 6px; padding: 22px 12px 20px; position: relative;
}
.profile-dialog-hero::before {
  content: ""; position: absolute; inset: 0; margin: auto; width: 260px; height: 260px;
  background: radial-gradient(circle, rgba(168,85,247,0.22), transparent 70%); pointer-events: none;
}
.profile-dialog-avatar {
  position: relative; width: 170px; height: 170px; display: flex; align-items: center; justify-content: center;
}
/* Same reasoning as .avatar-emblem, just larger for the dialog hero - */
/* now sized to read as the profile picture itself.                    */
.profile-dialog-avatar-emblem { width: 170px; height: 170px; }
.profile-dialog-avatar-badge {
  position: absolute; right: 2px; bottom: 2px; min-width: 40px; height: 40px; padding: 0 9px;
  display: flex; align-items: center; justify-content: center; border-radius: 999px;
  background: radial-gradient(circle at 32% 26%, #f4e9c9, var(--gold) 60%, #8a6a2c 100%);
  color: #2a1c05; font-size: 18px; font-weight: 800; line-height: 1;
  border: 3px solid var(--bg); box-shadow: 0 0 16px rgba(232,201,136,.65);
}
.profile-dialog-name-row {
  display: flex; align-items: center; gap: 7px; margin-top: 6px; padding: 4px 8px; border-radius: 8px;
  background: transparent; border: 1px solid transparent; color: var(--t1); transition: background .15s ease, border-color .15s ease;
}
.profile-dialog-name-row:hover { background: rgba(255,255,255,0.05); border-color: var(--border); }
.profile-dialog-name { font-size: 20px; font-weight: 800; letter-spacing: .01em; }
/* gemified edit affordance - a sapphire seal-coin: deliberately absent
   from the rest of this dialog (purple = progression, gold = rank/title,
   green = confirm) so it never gets mistaken for a status indicator */
.profile-dialog-pin {
  position: relative; flex: none;
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  color: #eaf4ff;
  background: radial-gradient(circle at 32% 28%, #8fd0ff, #2f6fd0 55%, #14295e 100%);
  border: 1px solid rgba(170,205,255,0.75);
  box-shadow:
    0 0 0 2px rgba(120,170,255,0.28),
    0 0 12px rgba(90,150,255,0.45),
    inset 0 1px 2px rgba(255,255,255,0.5);
  transition: transform .15s cubic-bezier(.16,1,.3,1), box-shadow .2s ease, filter .2s ease;
}
.profile-dialog-name-row:hover .profile-dialog-pin {
  transform: scale(1.12) rotate(-8deg);
  filter: brightness(1.14);
  box-shadow:
    0 0 0 2px rgba(140,185,255,0.5),
    0 0 20px rgba(90,150,255,0.65),
    inset 0 1px 2px rgba(255,255,255,0.6);
}
.profile-dialog-name-row:active .profile-dialog-pin { transform: scale(.94); }
.profile-dialog-name-edit {
  display: flex; align-items: center; gap: 8px; margin-top: 6px;
}
.profile-dialog-name-input {
  width: 190px; text-align: center; font-size: 18px; font-weight: 800; color: var(--t1);
  background: rgba(255,255,255,0.06); border: 1px solid var(--accent-bright); border-radius: 8px; padding: 6px 10px;
  outline: none; box-shadow: 0 0 0 3px rgba(168,85,247,0.22);
}
.profile-dialog-name-actions { display: flex; align-items: center; gap: 6px; flex: none; }
.rune-btn {
  display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0;
  border-radius: 7px; background: rgba(255,255,255,0.04); cursor: pointer;
  transition: transform .12s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease, opacity .15s ease;
}
.rune-btn:active { transform: scale(0.92); }
.rune-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
.rune-btn-confirm {
  color: var(--green); border: 1px solid rgba(95,181,131,0.4);
  box-shadow: 0 0 0 0 rgba(95,181,131,0);
}
.rune-btn-confirm:not(:disabled):hover {
  background: rgba(95,181,131,0.14); border-color: var(--green);
  box-shadow: 0 0 14px rgba(95,181,131,.55);
}
.rune-btn-cancel {
  color: var(--red-muted); border: 1px solid rgba(193,97,90,0.4);
}
.rune-btn-cancel:hover {
  background: rgba(193,97,90,0.14); border-color: var(--red-muted);
  box-shadow: 0 0 14px rgba(193,97,90,.5);
}
.profile-dialog-title-badge {
  display: inline-flex; align-items: center; margin-top: 8px;
  font-family: "Cinzel Decorative", "Shippori Mincho", "Zen Old Mincho", Georgia, serif;
  font-size: 19px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  background: linear-gradient(180deg, #fff6df 10%, var(--gold) 50%, #c39b52 90%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 6px rgba(232,201,136,.55));
  animation: titleBadgeGlow 2.8s ease-in-out infinite;
}
@keyframes titleBadgeGlow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(232,201,136,.4)); }
  50% { filter: drop-shadow(0 0 12px rgba(232,201,136,.9)); }
}
.profile-dialog-stats { margin-top: 20px; }
/* logo-first stat cards: the crest is the hero, number right under it,
   caption last. Bottom-aligned so all three cards read on one line
   even though Level intentionally has no crest */
.profile-stat { align-items: center; justify-content: flex-end; text-align: center; gap: 3px; }
.profile-stat .detail-stat-value { font-size: 19px; }
.profile-stat-glyph {
  width: 46px; height: 46px; margin-bottom: 2px;
  display: inline-flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 0 12px rgba(139,92,246,.55));
}
.profile-stat-glyph img,
.profile-stat-glyph svg { width: 100%; height: 100%; }
/* per-stat crest sizes - level leads, shields hero-size, xp close behind;
   xp/shield crests ride slightly higher off their number than level's */
.profile-stat-glyph-level { width: 68px; height: 68px; margin-bottom: 0; }
.profile-stat-glyph-shield { width: 63px; height: 63px; margin-bottom: 9px; }
.profile-stat-glyph-xp { width: 52px; height: 52px; margin-bottom: 14px; }

@media (max-width: 480px) {
  .profile-dialog-hero { padding: 14px 8px 16px; }
  .profile-dialog-hero::before { width: 210px; height: 210px; }
  .profile-dialog-avatar, .profile-dialog-avatar-emblem { width: 136px; height: 136px; }
  /* RankEmblem hardcodes its pixel size inline - stretch it to fill the
     smaller avatar box instead of transform-scaling it (scale never frees
     up layout space, which left dead gaps on small screens) */
  .profile-dialog-avatar-emblem .rank-emblem-wrap,
  .profile-dialog-avatar-emblem .rank-emblem { width: 100% !important; height: 100% !important; }
  .profile-dialog-name { font-size: 18px; }
  .profile-dialog-name-input { width: min(150px, 50vw); font-size: 16px; }
  .rune-btn { width: 27px; height: 27px; }
  .profile-dialog-title-badge { font-size: 15px; letter-spacing: .08em; }
  .profile-dialog-stats { gap: 7px; }
  .profile-dialog-stats .detail-stat { padding: 8px; }
  .profile-dialog-stats .detail-stat-value { font-size: 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .aura-app *, .aura-app *::before, .aura-app *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
`;
