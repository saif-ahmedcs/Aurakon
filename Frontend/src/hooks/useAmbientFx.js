"use client";

import { useState, useEffect, useMemo } from "react";

/* Generators for the ambient particle/animation fields scattered across
 * the dashboard. Each returns a stable random layout (memoised on its
 * count) so re-renders never reshuffle the scenery. */

export function useSparkles(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: 4 + Math.random() * 60,
        size: 1 + Math.random() * 2.4,
        delay: Math.random() * 7,
        duration: 3.5 + Math.random() * 4.5,
      })),
    [count],
  );
}

export function useRisingEmbers(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: 58 + Math.random() * 36,
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 50,
        dy: -(90 + Math.random() * 160),
        size: 1.2 + Math.random() * 2.4,
        delay: Math.random() * 11,
        duration: 8 + Math.random() * 8,
      })),
    [count],
  );
}

/* Still gold sparks scattered behind the journey banner - fixed, not
 * drifting, so the section reads as lit rather than animated. */
export function useGoldSparks(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: 8 + Math.random() * 84,
        left: 6 + Math.random() * 88,
        size: 2 + Math.random() * 2.6,
        opacity: 0.35 + Math.random() * 0.45,
      })),
    [count],
  );
}

/* Whole-page ambient embers - deliberately slow (25-45s per cycle) and
 * faint, felt at the edge of attention rather than drawing the eye. */
export function useAmbientSparkles(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 4 + Math.random() * 4,
        duration: 25 + Math.random() * 20,
        delay: Math.random() * 20,
      })),
    [count],
  );
}

/* Crossfades between two sources of the same scene whenever `src`
 * changes: keeps rendering the current image while the incoming one
 * fades in over it, then swaps them out. */
export function useCrossfadeImage(src) {
  const [current, setCurrent] = useState(src);
  const [incoming, setIncoming] = useState(null);

  useEffect(() => {
    if (src === current) return;
    setIncoming(src);
    const t = setTimeout(() => {
      setCurrent(src);
      setIncoming(null);
    }, 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return { current, incoming };
}
