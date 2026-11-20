import { create } from "@/lib/zustand";
import { useUiStore } from "@/store/uiStore";

/**
 * Coordinates every interruptive prompt so the user only ever sees one at a
 * time, and is asked for at most one thing (notifications OR install) per
 * session. Priority is enforced by timing: announcements load immediately,
 * the notification ask waits a few seconds, the install ask waits longer.
 */
export type PromptKind = "announcement" | "notifications" | "install";

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PromptState {
  active: PromptKind | null;
  askedThisSession: boolean;
  /** Claim the screen for a prompt. Returns false if it must not show now. */
  tryAcquire: (kind: PromptKind, opts?: { contextual?: boolean }) => boolean;
  release: (kind: PromptKind) => void;

  /** Set when an action makes a notification ask relevant (e.g. a task with
   * a due date was just created). Consumed by NotificationPromptModal. */
  notificationContext: { taskTitle: string } | null;
  requestContextualNotificationAsk: (taskTitle: string) => void;
  clearNotificationContext: () => void;

  /** Captured `beforeinstallprompt` event (Android/Chromium only). */
  deferredInstall: BeforeInstallPromptEvent | null;
  setDeferredInstall: (e: BeforeInstallPromptEvent | null) => void;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  active: null,
  askedThisSession: false,

  tryAcquire: (kind, opts = {}) => {
    const { active, askedThisSession } = get();
    if (active === kind) return true;
    if (active) return false;
    // Never stack a prompt on top of the task editor
    if (useUiStore.getState().editor) return false;
    if (kind !== "announcement" && askedThisSession && !opts.contextual) {
      return false;
    }
    set({
      active: kind,
      askedThisSession: askedThisSession || kind !== "announcement",
    });
    return true;
  },

  release: (kind) => {
    if (get().active === kind) set({ active: null });
  },

  notificationContext: null,
  requestContextualNotificationAsk: (taskTitle) =>
    set({ notificationContext: { taskTitle } }),
  clearNotificationContext: () => set({ notificationContext: null }),

  deferredInstall: null,
  setDeferredInstall: (e) => set({ deferredInstall: e }),
}));
