const FLOW_CACHE = "flow-shell-v1-22-2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon-32.png", "/apple-touch-icon.png", "/app-icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(FLOW_CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== FLOW_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(FLOW_CACHE);
        cache.put(request, response.clone());
        return response;
      } catch {
        const cache = await caches.open(FLOW_CACHE);
        return (await cache.match(request)) || (await cache.match("/"));
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || APP_SHELL.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(FLOW_CACHE);
      const cached = await cache.match(request);
      const networkPromise = fetch(request).then((response) => {
        cache.put(request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || networkPromise;
    })());
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Flow Dashboard";
  const options = {
    body: payload.body || "Nouvelle activité sur Flow",
    icon: "/app-icon-192.png",
    badge: "/app-icon-192.png",
    tag: payload.tag || "flow-update",
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || "/",
    },
  };

  event.waitUntil((async () => {
    const openClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const hasVisibleClient = openClients.some((client) => client.visibilityState === "visible");

    if (payload.kind === "update" && hasVisibleClient) {
      openClients.forEach((client) => client.postMessage({
        type: "flow-release-refresh",
        version: payload.version || "",
      }));
      return;
    }

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = allClients.find((client) => client.url.includes(self.location.origin));
    if (existing) {
      existing.focus();
      existing.navigate(targetUrl);
      return;
    }
    await clients.openWindow(targetUrl);
  })());
});
