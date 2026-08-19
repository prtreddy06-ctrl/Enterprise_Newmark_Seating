/**
 * Minimal service worker for the EnterprizSeat mobile companion PWA.
 *
 * This exists primarily so the app actually meets the standard installability
 * criteria (HTTPS + valid manifest + registered service worker with a fetch
 * handler) that Android Chrome checks before offering a real "Install App"
 * prompt — without this file, "Add to Home Screen" worked but a proper app
 * install banner would not reliably appear. It also gives basic offline
 * resilience for the app shell.
 */

const CACHE_NAME = "enterprizseat-shell-v1";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle simple GET navigations/assets; let everything else (API calls,
  // Firestore, POSTs) pass straight through to the network untouched.
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});
