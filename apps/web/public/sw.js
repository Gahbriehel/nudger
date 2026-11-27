// Service Worker for Nudger: offline reading + push notifications.
//
// Offline is read-only: pages and static assets are cached as you use the
// app, and the task list itself is kept by the app in localStorage.

// Bump to purge every device's saved copies on the next visit.
const VERSION = "v3";

// Dev servers serve un-hashed files (same URL, new content), so cache-first
// would keep showing old code. Only cache build assets on real deployments.
const IS_DEV_HOST =
  /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
    self.location.hostname,
  );
const PAGES_CACHE = `nudger-pages-${VERSION}`;
const ASSETS_CACHE = `nudger-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png";
const PRECACHE = [OFFLINE_URL, ICON, BADGE, "/icons/apple-touch-icon.png"];
const MAX_ASSETS = 250;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSETS_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PAGES_CACHE && k !== ASSETS_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Keep the asset cache from growing without bound across deploys. */
async function trimAssets() {
  const cache = await caches.open(ASSETS_CACHE);
  const keys = await cache.keys();
  const excess = keys.length - MAX_ASSETS;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

/** Pages: network first (always fresh online), saved copy when offline. */
async function handleNavigation(request) {
  const url = new URL(request.url);
  const key = url.origin + url.pathname; // ignore query strings
  try {
    const response = await fetch(request);
    const cacheable =
      response.ok &&
      !response.redirected &&
      !url.pathname.startsWith("/auth") &&
      !url.pathname.startsWith("/api");
    if (cacheable) {
      const copy = response.clone();
      caches.open(PAGES_CACHE).then((cache) => cache.put(key, copy));
    }
    return response;
  } catch {
    const cached = await caches.match(key, {
      cacheName: PAGES_CACHE,
      ignoreVary: true,
    });
    return cached || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

/** Hashed build assets, fonts and icons: cache first. */
async function handleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches
      .open(ASSETS_CACHE)
      .then((cache) => cache.put(request, copy))
      .then(trimAssets);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase etc.

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (
    !IS_DEV_HOST &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/images/"))
  ) {
    event.respondWith(handleAsset(request));
  }
  // Everything else (API, RSC data) goes straight to the network
});

// Handle incoming push messages
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let notificationData = {
    title: "Nudger Alert",
    body: "You have a task that needs attention!",
    icon: ICON,
    badge: BADGE,
    data: {
      url: "/",
      taskId: null,
    },
  };

  try {
    // Attempt to parse notification data as JSON
    const json = event.data.json();
    notificationData = {
      ...notificationData,
      title: json.title || notificationData.title,
      body: json.body || notificationData.body,
      data: {
        url: json.data?.url || notificationData.data.url,
        taskId: json.data?.taskId || null,
      },
    };
  } catch {
    // Fallback if the payload was plain text
    notificationData.body = event.data.text();
  }

  const actions = [];
  if (notificationData.data?.taskId) {
    actions.push({ action: "mark-complete", title: "✓ Mark Complete" });
  }
  actions.push({ action: "open", title: "Open App" });

  const taskId = notificationData.data?.taskId;
  const options = {
    body: notificationData.body,
    // A newer nudge for the same task replaces the old one instead of stacking
    ...(taskId ? { tag: `task-${taskId}`, renotify: true } : {}),
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    vibrate: [100, 50, 100],
    actions: actions,
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options),
  );
});

// Handle notification actions and clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // Handle "Mark Complete" shortcut action directly from notification
  if (event.action === "mark-complete") {
    const taskId = event.notification.data?.taskId;
    if (!taskId) return;

    event.waitUntil(
      fetch("/api/tasks/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to complete task");
          }
          return res.json();
        })
        .then((data) => {
          // Notify any open client windows to refresh UI
          self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
              for (const client of clientList) {
                client.postMessage({
                  type: "TASK_COMPLETED_VIA_NOTIFICATION",
                  taskId: taskId,
                  title: data.title,
                });
              }
            });

          // Show OS-level confirmation notification
          return self.registration.showNotification("Task Completed! 🎉", {
            body: data.title
              ? `"${data.title}" marked as complete.`
              : "Marked as complete.",
            icon: ICON,
            badge: BADGE,
            tag: "task-completed-confirmation",
            renotify: true,
          });
        })
        .catch((err) => {
          console.error("Error marking task complete via service worker:", err);
          return self.registration.showNotification("Update Failed", {
            body: "Could not mark task as complete. Please try opening Nudger.",
            icon: ICON,
            tag: "task-completed-error",
          });
        }),
    );
    return;
  }

  // Open the notification's page (usually the task itself)
  event.waitUntil(openUrl(event.notification.data?.url || "/"));
});

/**
 * Show `path` in the app: reuse an open window if there is one (the app
 * navigates in place, keeping its state), otherwise open a new one.
 */
async function openUrl(path) {
  const target = new URL(path, self.location.origin);
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const client =
    windows.find((c) => c.focused) ||
    windows.find((c) => c.visibilityState === "visible") ||
    windows.find((c) => new URL(c.url).origin === target.origin);

  if (!client) {
    if (self.clients.openWindow) return self.clients.openWindow(target.href);
    return;
  }

  const focused = await client.focus().catch(() => client);
  if (new URL(focused.url).href === target.href) return;

  // Signed-in pages handle this with client-side navigation
  const relative = target.pathname + target.search + target.hash;
  (focused || client).postMessage({ type: "NAVIGATE", url: relative });
}
