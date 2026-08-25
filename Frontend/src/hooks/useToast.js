"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const TOAST_DURATION_MS = 2600;

/* Single transient toast message with auto-dismiss; showing a new
 * message restarts the timer. */
export function useToast() {
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((text) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  return { toast, showToast };
}
