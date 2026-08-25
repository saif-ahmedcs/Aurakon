import { RANK_IMAGES } from "../../../constants/assets";

const EMBER_POINTS = Array.from({ length: 6 }, (_, i) => {
  const a = ((-90 + i * 60) * Math.PI) / 180;
  const r = 33;
  return {
    x: 50 + r * Math.cos(a),
    y: 46 + r * Math.sin(a),
    dx: Math.cos(a),
    dy: Math.sin(a),
    delay: i * 0.6,
  };
});

/* Glow grades from arcane purple at rank 1 toward radiant gold at rank */
/* 9, so the color itself communicates advancement - no circle, just a */
/* shape-hugging drop-shadow that follows the crest's own silhouette.  */
function rankGlowColor(tier, alpha) {
  const t = Math.max(0, Math.min(1, (tier - 1) / 8));
  const r = Math.round(150 + (255 - 150) * t);
  const g = Math.round(90 + (183 - 90) * t);
  const b = Math.round(240 + (56 - 240) * t);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function RankEmblem({ tier, size = 52, state = "done" }) {
  const src = RANK_IMAGES[tier];
  const locked = state === "upcoming";
  const active = state === "active";
  const glowVars = locked
    ? undefined
    : {
        "--glow-strong": rankGlowColor(tier, active ? 0.92 : 0.5),
        "--glow-soft": rankGlowColor(tier, active ? 0.55 : 0.22),
      };
  const wrapClass =
    "rank-emblem-wrap" +
    (active
      ? " rank-emblem-wrap-active"
      : locked
        ? " rank-emblem-wrap-locked"
        : " rank-emblem-wrap-done");

  return (
    <span
      className={wrapClass}
      style={{ width: size, height: size, ...glowVars }}
    >
      {active && (
        <span className="rank-emblem-embers" aria-hidden="true">
          {EMBER_POINTS.map((p, i) => (
            <i
              key={i}
              style={{
                left: p.x + "%",
                top: p.y + "%",
                animationDelay: p.delay + "s",
                "--dx": p.dx,
                "--dy": p.dy,
              }}
            />
          ))}
        </span>
      )}
      <img
        src={src}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        draggable="false"
        className={"rank-emblem" + (locked ? " rank-emblem-locked" : "")}
      />
    </span>
  );
}
