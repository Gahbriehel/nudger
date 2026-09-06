"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";
import {
  getPushSubscription,
  subscribeUserToPush,
} from "@/lib/pushNotification";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export function NotificationPromptModal() {
  const [showModal, setShowModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkAndPrompt = async () => {
      // 1. Check if push notifications are supported
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window;

      if (!supported) return;

      // 2. Check if already granted or denied at the browser level
      if (Notification.permission === "denied") return;
      if (Notification.permission === "granted") {
        // Double check they are actually subscribed to our backend
        try {
          const sub = await getPushSubscription();
          if (sub) return; // All good, they have notifications on
        } catch (err) {
          console.error("Error checking subscription:", err);
        }
      }

      // 3. Check cooldown / interval logic
      const nextPromptTimeString = localStorage.getItem(
        "nudger_next_notification_prompt",
      );
      const now = Date.now();

      if (nextPromptTimeString) {
        const nextPromptTime = parseInt(nextPromptTimeString, 10);
        if (now < nextPromptTime) {
          return; // Still in cooldown
        }
      }

      // If we reach here, we should show the modal.
      // Delay it slightly so it doesn't jump scare immediately on load
      timeoutId = setTimeout(() => {
        setShowModal(true);
      }, 3000);
    };

    checkAndPrompt();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const setRandomNextPromptInterval = () => {
    // Set next prompt randomly between 12 to 36 hours from now
    const randomHours = Math.floor(Math.random() * (36 - 12 + 1)) + 12;
    const nextPromptTime = Date.now() + randomHours * 60 * 60 * 1000;
    localStorage.setItem(
      "nudger_next_notification_prompt",
      nextPromptTime.toString(),
    );
  };

  const handleDismiss = () => {
    setRandomNextPromptInterval();
    setShowModal(false);
  };

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const sub = await subscribeUserToPush();
      if (sub) {
        toast.success("Notifications enabled!", {
          description: "You're all set to receive important nudges.",
        });
        setShowModal(false);
      } else {
        // They might have denied the prompt just now
        setRandomNextPromptInterval();
        setShowModal(false);
      }
    } catch (err: unknown) {
      console.error("Failed to enable notifications:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to enable notifications. Please check your browser settings.",
      );
      setRandomNextPromptInterval();
      setShowModal(false);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal Container */}
      <div className="relative border border-border bg-card/95 backdrop-blur-md w-full max-w-md rounded-3xl shadow-2xl p-7 overflow-hidden flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 before:absolute before:top-0 before:left-0 before:right-0 before:h-[4px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        {/* Dismiss Icon */}
        <button
          onClick={handleDismiss}
          disabled={isSubscribing}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted/50 p-2 rounded-full transition-colors disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="w-16 h-16 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground rounded-full flex items-center justify-center mb-5 ring-8 ring-primary/5">
          <BellRing size={28} className="animate-pulse" />
        </div>

        <h2 className="text-xl font-bold tracking-tight text-foreground mb-3">
          Don&apos;t Miss Important Tasks
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-[280px]">
          Nudger works best when it can remind you of tasks. Without
          notifications, you might forget important deadlines and schedules.
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
              "Enable Notifications"
            )}
          </Button>
          <Button
            onClick={handleDismiss}
            disabled={isSubscribing}
            variant="ghost"
            className="w-full h-11 font-medium text-muted-foreground hover:text-foreground text-sm"
          >
            Not Now
          </Button>
        </div>
      </div>
    </div>
  );
}
