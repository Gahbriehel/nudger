import type { Task } from "@/types/database.types";

/**
 * Deferred writes for undoable actions (complete, delete).
 *
 * The UI updates immediately and the server write is held back for a short
 * window; "Undo" simply cancels it, so nothing ever has to be reversed on the
 * server (e.g. a recurring task's rollover or a logged completion). Pending
 * writes are flushed right away when the page is hidden or closed, so leaving
 * the app never loses them.
 */

interface PendingCommit {
  commit: () => Promise<void>;
  /** Re-applies the optimistic change on top of freshly fetched tasks. */
  overlay?: (tasks: Task[]) => Task[];
  timer: ReturnType<typeof setTimeout> | null;
  committing: boolean;
}

const pending = new Map<string, PendingCommit>();

export const UNDO_WINDOW_MS = 5000;

async function run(key: string) {
  const entry = pending.get(key);
  if (!entry || entry.committing) return;
  if (entry.timer) clearTimeout(entry.timer);
  entry.committing = true;
  try {
    await entry.commit();
  } finally {
    // Keep the overlay until the write has landed, then drop it
    pending.delete(key);
  }
}

export function deferCommit(
  key: string,
  opts: {
    commit: () => Promise<void>;
    overlay?: (tasks: Task[]) => Task[];
    delayMs?: number;
  },
): { cancel: () => boolean } {
  // A newer action on the same key supersedes: commit the older one now
  if (pending.has(key)) void run(key);

  const entry: PendingCommit = {
    commit: opts.commit,
    overlay: opts.overlay,
    timer: null,
    committing: false,
  };
  entry.timer = setTimeout(() => void run(key), opts.delayMs ?? UNDO_WINDOW_MS);
  pending.set(key, entry);

  return {
    /** Returns false if it's too late (the write already started). */
    cancel: () => {
      if (pending.get(key) !== entry || entry.committing) return false;
      if (entry.timer) clearTimeout(entry.timer);
      pending.delete(key);
      return true;
    },
  };
}

export function flushPendingCommits() {
  for (const key of Array.from(pending.keys())) void run(key);
}

/** Apply all in-flight optimistic changes to a fresh task list. */
export function applyPendingOverlays(tasks: Task[]): Task[] {
  let result = tasks;
  for (const entry of pending.values()) {
    if (entry.overlay) result = entry.overlay(result);
  }
  return result;
}

// Don't lose pending writes when the user backgrounds or closes the app
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingCommits);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingCommits();
  });
}

/** Cancel a pending write by key. Returns true if it was still cancellable. */
export function cancelCommit(key: string): boolean {
  const entry = pending.get(key);
  if (!entry || entry.committing) return false;
  if (entry.timer) clearTimeout(entry.timer);
  pending.delete(key);
  return true;
}
