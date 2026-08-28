"use client";

import { useEffect } from "react";

/**
 * Registers the PWA worker only for production builds. Keeping it out of
 * development prevents cached assets from making local iteration confusing.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      // Ask the browser to check the worker script on each app load. A newer
      // worker activates after existing clients close, avoiding mixed builds.
      .then((registration) => registration.update())
      .catch(() => {
        // The app is fully usable without a service worker. Registration
        // failures should never interfere with login or game actions.
      });
  }, []);

  return null;
}
