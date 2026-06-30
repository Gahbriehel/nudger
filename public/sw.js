// Service Worker for Nudger Push Notifications

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push messages
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let notificationData = {
    title: "Nudger Alert",
    body: "You have a task that needs attention!",
    icon: "/images/nudger-app-icon.png",
    badge: "/images/nudger-app-icon.png",
    data: {
      url: "/",
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
      },
    };
  } catch {
    // Fallback if the payload was plain text
    notificationData.body = event.data.text();
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    vibrate: [100, 50, 100],
    actions: [
      { action: "open", title: "Open Nudger" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options),
  );
});

// Handle notification click to navigate the user
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
