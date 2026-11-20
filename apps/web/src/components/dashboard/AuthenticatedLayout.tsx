"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { authService } from "@/services/auth.service";
import { DashboardHeader } from "./DashboardHeader";
import { InstallPrompt } from "./InstallPrompt";
import { NotificationPromptModal } from "./NotificationPromptModal";
import { useNotificationChecker } from "@/hooks/useNotificationChecker";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { TaskEditorModal } from "./TaskEditorModal";
import { BottomNav } from "./navigation";

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setSession, setLoading, loading: authLoading } = useAuthStore();
  const { fetchTasks } = useTaskStore();

  // Run real-time background task reminder scanner
  useNotificationChecker();

  // Track user activity
  useActivityTracker();

  // Sync session on mount
  useEffect(() => {
    authService
      .getSession()
      .then((session) => {
        setSession(session);
        setLoading(false);
        if (session) {
          fetchTasks();
        }
      })
      .catch((err) => {
        console.error("Auth initialization failed:", err);
        setLoading(false);
      });
  }, [fetchTasks, setLoading, setSession]);

  // Silently refresh when the app returns to the foreground (installed PWAs
  // are often resumed from the background with hours-old data).
  useEffect(() => {
    let lastRefresh = Date.now();
    const MIN_INTERVAL_MS = 30_000;

    const handleVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!useAuthStore.getState().session) return;
      if (Date.now() - lastRefresh < MIN_INTERVAL_MS) return;
      lastRefresh = Date.now();
      fetchTasks();
    };

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
    };
  }, [fetchTasks]);

  // Listen for Service Worker messages (e.g. task completed via push action)
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "TASK_COMPLETED_VIA_NOTIFICATION") {
        toast.success("Task completed!", {
          description: event.data.title
            ? `"${event.data.title}" was marked complete.`
            : "Task marked complete via notification.",
        });
        fetchTasks();
      }
    };

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, [fetchTasks]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="md" label="Restoring session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <DashboardHeader />

      {/* Bottom padding clears the mobile tab bar + home indicator */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1 mt-6 md:mt-8 space-y-8 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] md:pb-12">
        {children}
      </main>

      <BottomNav />
      <TaskEditorModal />

      {/* Interruptive prompts — coordinated so at most one shows at a time */}
      <NotificationPromptModal />
      <InstallPrompt />
    </div>
  );
}
