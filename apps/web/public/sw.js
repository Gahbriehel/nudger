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

  const options = {
    body: notificationData.body,
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
            icon: "/images/nudger-app-icon.png",
            badge: "/images/nudger-app-icon.png",
            tag: "task-completed-confirmation",
            renotify: true,
          });
        })
        .catch((err) => {
          console.error("Error marking task complete via service worker:", err);
          return self.registration.showNotification("Update Failed", {
            body: "Could not mark task as complete. Please try opening Nudger.",
            icon: "/images/nudger-app-icon.png",
            tag: "task-completed-error",
          });
        }),
    );
    return;
  }

  // Open / focus app window for notification click or "open" action
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
