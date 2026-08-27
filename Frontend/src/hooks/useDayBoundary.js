"use client";

import { useEffect, useRef } from "react";
import { todayInZone, msUntilNextMidnight } from "../utils/dates";

/* Detect when the user's local day changes and fire a callback.
 *
 * Strategy:
 *   1. Schedule a setTimeout for the exact moment midnight arrives
 *      in the user's IANA timezone (via msUntilNextMidnight).
 *   2. Listen for visibilitychange to catch the case where the tab
 *      was backgrounded past midnight and the scheduled timeout was
 *      already missed.
 *   3. On day change, call the onDayChange callback, then reschedule
 *      the timeout for the following midnight.
 *
 * The callback ref is kept in a ref so the effect never needs to
 * re-run when the callback identity changes (avoids stale closures
 * without adding the callback to the dep array). */
export function useDayBoundary(timeZone, onDayChange) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(onDayChange);
  const lastDayRef = useRef(null);

  // Always point at the latest callback without re-triggering effects.
  callbackRef.current = onDayChange;

  useEffect(() => {
    if (!timeZone) return;

    lastDayRef.current = todayInZone(timeZone);

    function schedule() {
      clearTimeout(timeoutRef.current);
      const ms = msUntilNextMidnight(timeZone);
      if (ms == null) return; // invalid zone – skip
      timeoutRef.current = setTimeout(() => {
        checkAndFire();
        schedule();
      }, ms);
    }

    function checkAndFire() {
      const today = todayInZone(timeZone);
      if (today !== lastDayRef.current) {
        lastDayRef.current = today;
        callbackRef.current(today);
      }
    }

    schedule();

    function onVisibility() {
      if (document.visibilityState === "visible") {
        checkAndFire();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timeoutRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [timeZone]);
}
