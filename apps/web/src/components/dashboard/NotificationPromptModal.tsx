"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";
import {
  getPushSubscription,
  subscribeUserToPush,
} from "@/lib/pushNotification";
import { isPushSupported, withTimeout } from "@/lib/platform";
import { canAsk, recordDismissal, recordDone } from "@/lib/promptCooldown";
import { usePromptStore } from "@/store/promptStore";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useTaskStore } from "@/store/taskStore";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

const LAUNCH_DELAY_MS = 4000;
const CONTEXTUAL_DELAY_MS = 600;

type PushStatus = "unsupported" | "denied" | "subscribed" | "askable";

async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  const sub = await withTimeout(
    getPushSubscription().catch(() => null),
    3000,
    null,
  );
  if (sub) return "subscribed";

  // Permission was granted earlier but this device lost its subscription:
  // re-subscribe silently instead of asking again.
  if (Notification.permission === "granted") {
    try {
      await subscribeUserToPush();
      return "subscribed";
    } catch (err) {
      console.error("Silent push re-subscribe failed:", err);
    }
  }
  return "askable";
}

/**
 * Asks for notification permission at most once per session, preferably in
 * context (right after the user creates a task with a time attached).
 */
export function NotificationPromptModal() {
  const [showModal, setShowModal] = useState(false);
  const [contextTitle, setContextTitle] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const hasLoaded = useTaskStore((s) => s.hasLoaded);
  const { tryAcquire, release, notificationContext, clearNotificationContext } =
    usePromptStore();
  const launchCheckedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Pending timers live outside effect cleanup: store updates (clearing the
  // context, background task refreshes) must not cancel a scheduled ask.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const open = useCallback(
    (title: string | null, contextual: boolean) => {
      if (!tryAcquire("notifications", { contextual })) return;
      setContextTitle(title);
      setShowModal(true);
    },
    [tryAcquire],
  );

  // Launch-time ask: only for users who already rely on timed tasks
  useEffect(() => {
    if (!hasLoaded || launchCheckedRef.current) return;
    launchCheckedRef.current = true;

    const hasTimedTasks = useTaskStore
      .getState()
      .tasks.some(
        (t) => t.status !== "completed" && (t.due_date || t.reminder_at),
      );
    if (!hasTimedTasks || !canAsk("notifications")) return;

    getPushStatus().then((status) => {
      if (status !== "askable") return;
      schedule(() => open(null, false), LAUNCH_DELAY_MS);
    });
  }, [hasLoaded, open]);

  // Contextual ask: triggered right after a timed task is created
  useEffect(() => {
    if (!notificationContext) return;
    const { taskTitle } = notificationContext;
    clearNotificationContext();
    if (!canAsk("notifications", { ignoreCooldown: true })) return;

    getPushStatus().then((status) => {
      if (status !== "askable") return;
      // Let the create modal finish closing first
      schedule(() => open(taskTitle, true), CONTEXTUAL_DELAY_MS);
    });
  }, [notificationContext, clearNotificationContext, open]);

  const close = () => {
    setShowModal(false);
    release("notifications");
  };

  const handleDismiss = () => {
    recordDismissal("notifications");
    close();
  };

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      await subscribeUserToPush();
      recordDone("notifications");
      toast.success("Notifications enabled");
    } catch (err: unknown) {
      if (Notification.permission === "denied") {
        // The browser won't let us ask again; Settings explains how to reset
        recordDone("notifications");
      } else {
        recordDismissal("notifications");
        toast.error(
          err instanceof Error
            ? err.message
            : "Couldn't enable notifications. Try again from Settings.",
        );
      }
    } finally {
      setIsSubscribing(false);
      close();
    }
  };

  useDialogFocus(
    showModal,
    dialogRef,
    isSubscribing ? undefined : handleDismiss,
  );

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={isSubscribing ? undefined : handleDismiss}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-prompt-title"
        className="relative outline-none border border-border bg-card/95 backdrop-blur-md w-full max-w-md rounded-3xl shadow-2xl p-7 overflow-hidden flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 before:absolute before:top-0 before:left-0 before:right-0 before:h-[4px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue"
      >
        <button
          onClick={handleDismiss}
          disabled={isSubscribing}
          aria-label="Not now"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 p-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="w-16 h-16 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground rounded-full flex items-center justify-center mb-5 ring-8 ring-primary/5">
          <BellRing size={28} />
        </div>

        <h2
          id="notif-prompt-title"
          className="text-xl font-bold tracking-tight text-foreground mb-3"
        >
          {contextTitle ? "Want a nudge for this?" : "Turn on reminders"}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-[300px]">
          {contextTitle ? (
            <>
              Nudger can remind you about{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{contextTitle}&rdquo;
              </span>{" "}
              when it&apos;s due, even when the app is closed.
            </>
          ) : (
            "Get reminded when tasks are due, even when the app is closed. You can change this any time in Settings."
          )}
        </p>

        <div className="flex flex-col w-full gap-3">
          <Button
            onClick={handleEnable}
            disabled={isSubscribing}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-md text-sm transition-all"
          >
            {isSubscribing ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" className="text-current" /> Enabling...
              </span>
            ) : (
              "Turn on notifications"
            )}
          </Button>
          <Button
            onClick={handleDismiss}
            disabled={isSubscribing}
            variant="ghost"
            className="w-full h-11 font-medium text-muted-foreground hover:text-foreground text-sm"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
