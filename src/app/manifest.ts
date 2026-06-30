import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nudger",
    short_name: "Nudger",
    description:
      "Productivity system for tracking tasks, subtasks, recurrence rules, and cognitive memory cues.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a", // Sleek slate-900 color
    theme_color: "#6366f1", // Indigo-500 brand color
    icons: [
      {
        src: "/images/nudger-app-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/nudger-app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
