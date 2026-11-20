import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Stable identity, so future start_url changes don't create a "new" app
    id: "/",
    name: "Nudger",
    short_name: "Nudger",
    description:
      "Productivity system for tracking tasks, subtasks, recurrence rules, and cognitive memory cues.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Splash screen matches the light app background, so launch doesn't flash
    background_color: "#f8f9fc",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Long-press the app icon (Android)
    shortcuts: [
      {
        name: "New task",
        short_name: "New task",
        url: "/?new=task",
        icons: [
          {
            src: "/icons/shortcut-new-task.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Nudges",
        short_name: "Nudges",
        url: "/nudgelist",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
