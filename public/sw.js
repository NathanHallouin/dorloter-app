/**
 * Service Worker Dorloter.
 *
 * Stratégies :
 * - cache-first pour les assets statiques (/_next/static, fonts, images)
 * - network-first pour les pages HTML et la navigation (fallback cache si offline)
 * - network-only pour les requêtes POST / APIs / auth (pas de cache)
 * - Web Push : handler pour afficher les notifications système
 */

const CACHE_VERSION = "miaou-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

const PRECACHE_URLS = ["/", "/adopter", "/perdus-trouves", "/icon.svg"];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Ne bloque pas l'install si une URL précachée n'est pas dispo
      })
  );
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Même origine uniquement
  if (url.origin !== self.location.origin) return;

  // Ne cache pas les non-GET
  if (request.method !== "GET") return;

  // Ne cache pas les API / auth / RSC / Next internals dynamiques
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.includes("__rsc") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  // Assets statiques : cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    /\.(png|jpg|jpeg|webp|svg|woff2?|ttf|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages HTML : network-first avec fallback cache
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback ultime : page d'accueil cachée
    const fallback = await caches.match("/");
    if (fallback) return fallback;
    return Response.error();
  }
}

// ─── Messages du client (pré-cache explicite) ──────────────────────────────
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "cache-urls" && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(PAGES_CACHE).then((cache) =>
        Promise.allSettled(
          data.urls.map((u) =>
            fetch(u, { credentials: "same-origin" })
              .then((res) => (res.ok ? cache.put(u, res) : null))
              .catch(() => null)
          )
        )
      )
    );
  }
});

// ─── Web Push ───────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: data.data || {},
    tag: data.tag,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Dorloter", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if (c.url === url && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
