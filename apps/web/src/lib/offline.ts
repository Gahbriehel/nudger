import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { Task } from "@/types/database.types";

// ── Connectivity ────────────────────────────────────────────────────────────

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Live `navigator.onLine` (true during SSR). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export const isOffline = () =>
  typeof navigator !== "undefined" && !navigator.onLine;

/**
 * Offline mode is read-only. Call before any change; when offline it explains
 * why nothing happened and returns false.
 */
export function requireOnline(): boolean {
  if (!isOffline()) return true;
  toast("You're offline", {
    id: "offline-readonly",
    description: "Changes are paused until you reconnect.",
  });
  return false;
}

// ── Saved copy of the task list (for offline reading) ───────────────────────

const CACHE_KEY = "nudger_offline_tasks_v1";

interface TaskCache {
  userId: string;
  savedAt: string;
  tasks: Task[];
}

export function readTaskCache(): TaskCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TaskCache;
    return Array.isArray(parsed?.tasks) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeTaskCache(userId: string, tasks: Task[]) {
  try {
    // Unsaved optimistic items (temp ids) would be stale on next launch
    const saved = tasks.filter((t) => !t.id.startsWith("temp-"));
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        userId,
        savedAt: new Date().toISOString(),
        tasks: saved,
      } satisfies TaskCache),
    );
  } catch {
    // Storage full or unavailable: offline reading just won't be available
  }
}

/** Remove everything kept for offline use (call on sign-out). */
export async function clearOfflineData() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("nudger-pages"))
          .map((k) => caches.delete(k)),
      );
    }
  } catch {
    /* ignore */
  }
}
