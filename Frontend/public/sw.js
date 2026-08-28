/*
 * Aurakon's service worker deliberately caches only static, public assets.
 * Authenticated API calls and all other dynamic data are left to the browser
 * network stack so the backend remains the sole source of game state.
 */
const STATIC_CACHE = "aurakon-static-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("aurakon-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

function isCacheableStaticAsset(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return false;
  }

  // Never handle API calls or requests carrying credentials explicitly.
  if (url.pathname.startsWith("/api/") || request.headers.has("authorization")) {
    return false;
  }

  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/")
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    // Do not cache documents. This guarantees every online navigation gets
    // the current deployment and avoids storing account-specific HTML.
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isCacheableStaticAsset(request, url)) {
    event.respondWith(cacheFirst(request));
  }
});
