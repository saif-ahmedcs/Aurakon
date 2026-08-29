"use client";

import { CHARACTER_ASSETS } from "../../../../constants/assets";
import {
  useSparkles,
  useRisingEmbers,
  useAmbientSparkles,
  useCrossfadeImage,
} from "../../../../hooks/useAmbientFx";

/* The identity plate burned directly into the hero art - this is what
   turns the character render from ambient wallpaper into "this is your
   character, at this rank, this far along." Shared between the desktop
   full-bleed hero and the mobile character card so both read as the
   same moment. */
function HeroPlate({
  name,
  stageTitle,
  level,
  xpCurrent,
  xpTotal,
  xpPercent,
  isMaxRank,
}) {
  const atMaxRank = Boolean(isMaxRank);
  return (
    <div className="hero-plate">
      <span className="hero-plate-eyebrow">
        {name} · Level {level}
      </span>
      <h1 className="hero-plate-title">{stageTitle}</h1>
      <div className="hero-plate-bar-track">
        <div
          className="hero-plate-bar-fill"
          style={{ width: xpPercent + "%" }}
        />
      </div>
      <span className="hero-plate-sub">
        {atMaxRank
          ? xpCurrent.toLocaleString() + " XP · Highest rank achieved"
          : xpCurrent.toLocaleString() +
            " / " +
            xpTotal.toLocaleString() +
            " XP toward next rank"}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Full-page cinematic background - crossfades between XP-stage art  */
/* ---------------------------------------------------------------- */

export function BackgroundLayer({
  gender,
  stage,
  name,
  stageTitle,
  level,
  xpCurrent,
  xpTotal,
  xpPercent,
  isMaxRank,
}) {
  const src = CHARACTER_ASSETS[gender][String(stage)];
  const { current, incoming } = useCrossfadeImage(src);
  const sparkles = useSparkles(14);
  const risingEmbers = useRisingEmbers(20);

  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="bg-img-frame">
        <img className="bg-img" src={current} alt="" />
        {incoming && (
          <img className="bg-img bg-img-incoming" src={incoming} alt="" />
        )}
      </div>
      <div className="bg-img-fade" />
      <div className="bg-vignette" />
      <div className="bg-character-glow" />
      <div className="bg-glow-blob bg-glow-blob-a" />
      <div className="bg-glow-blob bg-glow-blob-b" />
      <div className="sparkle-layer">
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="sparkle"
            style={{
              top: s.top + "%",
              left: s.left + "%",
              width: s.size + "px",
              height: s.size + "px",
              animationDelay: s.delay + "s",
              animationDuration: s.duration + "s",
            }}
          />
        ))}
      </div>
      <div className="rising-ember-field">
        {risingEmbers.map((e) => (
          <span
            key={e.id}
            className="ember"
            style={{
              top: e.top + "%",
              left: e.left + "%",
              width: e.size + "px",
              height: e.size + "px",
              "--dx": e.dx + "px",
              "--dy": e.dy + "px",
              animationDelay: e.delay + "s",
              animationDuration: e.duration + "s",
            }}
          />
        ))}
      </div>
      <HeroPlate
        name={name}
        stageTitle={stageTitle}
        level={level}
        xpCurrent={xpCurrent}
        xpTotal={xpTotal}
        xpPercent={xpPercent}
        isMaxRank={isMaxRank}
      />
    </div>
  );
}

/* Whole-page ambient embers, fixed to the viewport so they stay visible
 * everywhere - top, bottom, mid-scroll - rather than living inside one
 * panel. Deliberately slow (25-45s per cycle) and faint, felt at the
 * edge of attention rather than drawing the eye. */
export function AmbientSparkField() {
  const sparkles = useAmbientSparkles(28);
  return (
    <div className="ambient-spark-field" aria-hidden="true">
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="ambient-sparkle"
          style={{
            top: s.top + "%",
            left: s.left + "%",
            width: s.size + "px",
            height: s.size + "px",
            animationDuration: s.duration + "s",
            animationDelay: s.delay + "s",
          }}
        />
      ))}
    </div>
  );
}

/* Mobile only: the character as a normal, contained card that scrolls
   with the page - avoids ever having "art" and "app background" read
   as two different backgrounds, since this is just one card among
   others sitting on the single page background. */
export function CharacterCard({
  gender,
  stage,
  name,
  stageTitle,
  level,
  xpCurrent,
  xpTotal,
  xpPercent,
  isMaxRank,
}) {
  const src = CHARACTER_ASSETS[gender][String(stage)];
  const { current, incoming } = useCrossfadeImage(src);

  return (
    <div className="character-card" aria-label="Your character">
      <img className="character-card-img" src={current} alt="" />
      {incoming && (
        <img
          className="character-card-img character-card-img-incoming"
          src={incoming}
          alt=""
        />
      )}
      <div className="character-card-shade" />
      <HeroPlate
        name={name}
        stageTitle={stageTitle}
        level={level}
        xpCurrent={xpCurrent}
        xpTotal={xpTotal}
        xpPercent={xpPercent}
        isMaxRank={isMaxRank}
      />
    </div>
  );
}
