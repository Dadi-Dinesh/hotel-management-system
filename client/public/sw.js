/**
 * ServeSync Service Worker (Phase 9 — PWA & Offline Mode)
 *
 * Hand-rolled, no external library — this repo's build is Turbopack-based
 * and a plain static-file service worker needs no bundler integration at
 * all, which keeps it simple and dependency-free.
 *
 * NEVER intercepted (always pass straight to the network):
 *   - non-GET requests (POST/PATCH/PUT/DELETE) — every write in this app
 *     (orders, billing, printing, auth) must always hit the real server.
 *   - /socket.io/ — realtime transport must never be cached or delayed.
 *   - /api/auth/ — login must always be a live check.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `servesync-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `servesync-images-${CACHE_VERSION}`;
const BRANDING_CACHE = `servesync-branding-${CACHE_VERSION}`;
const MENU_CACHE = `servesync-menu-${CACHE_VERSION}`;
const SHELL_CACHE = `servesync-shell-${CACHE_VERSION}`;
const CURRENT_CACHES = [STATIC_CACHE, IMAGE_CACHE, BRANDING_CACHE, MENU_CACHE, SHELL_CACHE];

const OFFLINE_URL = "/offline";
const SHELL_PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

// ─────────────────────────────────────────
// INSTALL — pre-cache the offline fallback shell
// ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_PRECACHE_URLS))
      .catch(() => {
        // Pre-cache is best-effort — a slow/offline first install shouldn't
        // block activation; runtime caching still fills things in as used.
      })
  );
  self.skipWaiting();
});

// ─────────────────────────────────────────
// ACTIVATE — purge any cache from a previous version
// ─────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => !CURRENT_CACHES.includes(name)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────
// MESSAGE — support a "Force Refresh" action from the app's Settings page
// ─────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─────────────────────────────────────────
// BACKGROUND SYNC — wake up any open tab to drain its offline queue
// (the queue itself lives in page localStorage, so the SW can't drain it
// directly; this is a reliable wake-up signal, not the drain itself)
// ─────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "servesync-offline-queue") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SYNC_REQUESTED" }));
      })
    );
  }
});

// ─────────────────────────────────────────
// FETCH ROUTING
// ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch writes or realtime transport — pass straight through.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.pathname.startsWith("/socket.io/")) return;
  if (url.pathname.startsWith("/api/auth/")) return;

  // Navigations (page loads) — Network First with an offline-shell fallback.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request));
    return;
  }

  // Next.js static build assets + local fonts — Cache First (content-hashed, immutable).
  if (url.pathname.startsWith("/_next/static/") || /\.(woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Images — restaurant logos/menu photos on Cloudinary (proxied through
  // Next's /_next/image optimizer, per next.config.mjs's remotePatterns),
  // plus local app images — Stale While Revalidate.
  if (
    url.hostname === "res.cloudinary.com" ||
    url.pathname.startsWith("/_next/image") ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    // Restaurant branding profile — GET /api/restaurants/:slug (no further segments).
    if (/^\/api\/restaurants\/[^/]+$/.test(url.pathname)) {
      event.respondWith(cacheFirst(request, BRANDING_CACHE));
      return;
    }

    // Menu/category data, and live session/order status — Network First with cache fallback,
    // so a customer can still browse the cached menu or check their last known order status offline.
    const isMenuOrStatus =
      /\/menu\b/.test(url.pathname) ||
      /\/categories\b/.test(url.pathname) ||
      /^\/api\/sessions\/[^/]+$/.test(url.pathname) ||
      /^\/api\/tables\//.test(url.pathname) ||
      /^\/api\/restaurants\/[^/]+\/tables\//.test(url.pathname);

    if (isMenuOrStatus) {
      event.respondWith(networkFirst(request, MENU_CACHE));
      return;
    }

    // Every other API GET (orders list, admin data, etc.) — always live, never cached.
    return;
  }

  // Known static shell files only (icons, manifest) — Stale While Revalidate.
  // Deliberately NOT a catch-all: Next.js App Router issues same-origin GET
  // "RSC" payload fetches for prefetching/soft navigation that must always
  // stay live, so anything not explicitly matched above just passes through
  // to the network untouched.
  if (url.origin === self.location.origin && (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.ico")) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});

// ─────────────────────────────────────────
// STRATEGIES
// ─────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return the cached copy immediately if we have one; otherwise wait on the network.
  return cached || (await networkFetch) || Response.error();
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function handleNavigate(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const cachedPage = await cache.match(request);
    if (cachedPage) return cachedPage;
    const offlinePage = await cache.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;
    return new Response(
      "<!doctype html><title>Offline</title><body style='font-family:sans-serif;padding:40px;text-align:center;'>You're offline and this page hasn't been visited before.</body>",
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
