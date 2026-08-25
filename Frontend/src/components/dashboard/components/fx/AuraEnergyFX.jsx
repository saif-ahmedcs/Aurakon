"use client";

import { useMemo } from "react";

/* ---------------------------------------------------------------- */
/* Aura Energy banner edge effects - a soft, premium aura hugging the */
/* banner's outer border: curved SVG flame wisps (bezier paths only,  */
/* no straight-edged geometry) swaying gently at the edges and        */
/* corners, tiny glowing particles drifting near the border, and a    */
/* soft blurred glow pooling in the corners. Everything stays within  */
/* the outer few percent of the frame so the medallion, heading, and  */
/* progress track in the centre stay completely clean.                */
/*                                                                    */
/* Not currently mounted anywhere - kept for the upcoming banner      */
/* rework.                                                            */
/* ---------------------------------------------------------------- */

/* tiny flame-like flicks that root directly at the border line and    */
/* lick a few pixels inward/outward before dissolving - never a long   */
/* streak, never detached from the edge. Built as a small organic      */
/* blob (irregular border-radius), not a geometric shape.              */
function useAuraEdgeFlickers(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const edge = ["top", "right", "bottom", "left"][i % 4];
        const along = 6 + Math.random() * 88;
        const pos =
          edge === "top"
            ? { top: "-1px", left: along + "%" }
            : edge === "bottom"
              ? { bottom: "-1px", left: along + "%" }
              : edge === "left"
                ? { top: along + "%", left: "-1px" }
                : { top: along + "%", right: "-1px" };
        const baseRot = { top: 180, bottom: 0, left: 90, right: -90 }[edge];
        const tint = ["violet", "white", "violet"][i % 3];
        return {
          id: i,
          pos,
          tint,
          width: 2.5 + Math.random() * 2,
          height: 4 + Math.random() * 5,
          rot: baseRot + (Math.random() - 0.5) * 16,
          delay: Math.random() * 3.6,
          duration: 0.8 + Math.random() * 1,
        };
      }),
    [count],
  );
}

/* particles kept within a very thin band right at the border - never  */
/* drifting toward the centre of the banner.                           */
function useAuraEdgeParticles(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const edge = ["top", "right", "bottom", "left"][i % 4];
        const along = 4 + Math.random() * 92;
        const depth = 0.5 + Math.random() * 3.5;
        const pos =
          edge === "top"
            ? { top: depth + "%", left: along + "%" }
            : edge === "bottom"
              ? { top: 100 - depth + "%", left: along + "%" }
              : edge === "left"
                ? { top: along + "%", left: depth * 0.35 + "%" }
                : { top: along + "%", left: 100 - depth * 0.35 + "%" };
        const tint = ["violet", "white", "violet"][i % 3];
        return {
          id: i,
          pos,
          tint,
          size: 1.6 + Math.random() * 1.8,
          delay: Math.random() * 3,
          duration: 2.4 + Math.random() * 2.2,
        };
      }),
    [count],
  );
}

function AuraFlicker({ style, tint }) {
  return (
    <span
      className={"aura-fx-flicker aura-fx-flicker-" + tint}
      style={style}
      aria-hidden="true"
    />
  );
}

export function AuraEnergyFX() {
  const flickers = useAuraEdgeFlickers(10);
  const particles = useAuraEdgeParticles(10);
  return (
    <span className="aura-strip-fx" aria-hidden="true">
      <span className="aura-strip-border-glow" />
      <span className="aura-fx-corner aura-fx-corner-tl" />
      <span className="aura-fx-corner aura-fx-corner-br" />
      {flickers.map((f) => (
        <AuraFlicker
          key={f.id}
          tint={f.tint}
          style={{
            ...f.pos,
            width: f.width + "px",
            height: f.height + "px",
            animationDelay: f.delay + "s",
            animationDuration: f.duration + "s",
            "--rot": f.rot + "deg",
          }}
        />
      ))}
      {particles.map((p) => (
        <i
          key={p.id}
          className={"aura-fx-particle aura-fx-particle-" + p.tint}
          style={{
            ...p.pos,
            width: p.size + "px",
            height: p.size + "px",
            animationDelay: p.delay + "s",
            animationDuration: p.duration + "s",
          }}
        />
      ))}
    </span>
  );
}
