"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const TOAST_DURATION_MS = 2600;

/* Queued toast messages, shown one at a time with auto-dismiss/advance.
 *
 * A single check-in can legitimately trigger several independent,
 * backend-confirmed reward events in the same synchronous continuation
 * (e.g. "+XP", "Guardian Shield earned!", a consistency-bonus toast per
 * bonus) - all fired via showToast() with no await in between, so React
 * batches the state updates. A single-slot `toast` string would have
 * each call clobber the previous one before it ever paints (100% of
 * shield-earning completions lost their shield toast this way). Instead
 * every showToast() call appends to a queue; only the head is rendered,
 * and it advances to the next queued message after TOAST_DURATION_MS -
 * so every event gets its own turn on screen instead of being silently
 * dropped. */
export function useToast() {
  const [queue, setQueue] = useState([]);
  const nextId = useRef(0);

  const showToast = useCallback((text) => {
    nextId.current += 1;
    setQueue((prev) => [...prev, { id: nextId.current, text }]);
  }, []);

  const current = queue[0] || null;

  useEffect(() => {
    if (!current) return undefined;
    const timer = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
    // Re-arm only when the head of the queue actually changes - a
    // second showToast() while one is already showing must queue
    // behind it, not reset the in-progress display's timer.
  }, [current]);

  return {
    toast: current ? current.text : null,
    // Stable per-message id so consumers can key the rendered toast
    // element on it - two consecutive identically-worded toasts (e.g.
    // "Check-in undone" twice in a row) still remount so any enter
    // animation restarts, instead of silently no-opping as the same
    // DOM node with unchanged text.
    toastId: current ? current.id : null,
    showToast,
  };
}
