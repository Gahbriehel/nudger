"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { OfflineBanner } from "./OfflineBanner";
import { WelcomeTour } from "./WelcomeTour";
import { useUiStore } from "@/store/uiStore";
import { withTimeout } from "@/lib/platform";
import { flushPendingCommits } from "@/lib/deferredCommit";
import { isOffline, readTaskCache, writeTaskCache } from "@/lib/offline";

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

  const router = useRouter();

  // Sync session on mount. Saved tasks are shown immediately (and are all
  // there is when offline); the network copy replaces them when it arrives.
  useEffect(() => {
    const showSavedTasks = (userId?: string) => {
      const cache = readTaskCache();
      if (!cache || (userId && cache.userId !== userId)) return;
      if (useTaskStore.getState().hasLoaded) return;
      useTaskStore.setState({ tasks: cache.tasks, hasLoaded: true });
    };

    // Offline, a session refresh can retry for a long time; don't wait on it
    withTimeout(
      authService.getSession().catch(() => null),
      isOffline() ? 1500 : 10_000,
      null,
    )
      .then((session) => {
        setSession(session);
        setLoading(false);
        if (session) {
          showSavedTasks(session.user.id);
          fetchTasks();
        } else if (isOffline()) {
          showSavedTasks();
        }
      })
      .catch((err) => {
        console.error("Auth initialization failed:", err);
        setLoading(false);
      });
  }, [fetchTasks, setLoading, setSession]);

  // Keep a copy of the latest tasks on the device for offline reading
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useTaskStore.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const userId = useAuthStore.getState().user?.id;
        const { tasks, hasLoaded } = useTaskStore.getState();
        if (userId && hasLoaded) writeTaskCache(userId, tasks);
      }, 1000);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // Back online: send anything still pending, then catch up
  useEffect(() => {
    const handleOnline = async () => {
      await flushPendingCommits();
      if (!useAuthStore.getState().session) {
        const session = await authService.getSession().catch(() => null);
        setSession(session);
      }
      fetchTasks();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchTasks, setSession]);

  // Home-screen shortcut "New task" opens /?new=task
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("new") !== "task") return;
    url.searchParams.delete("new");
    window.history.replaceState(null, "", url.pathname + url.search);
    useUiStore.getState().openCreateTask();
  }, []);

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
      // Notification tapped while the app was already open
      if (
        event.data?.type === "NAVIGATE" &&
        typeof event.data.url === "string" &&
        event.data.url.startsWith("/")
      ) {
        router.push(event.data.url);
        return;
      }
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
  }, [fetchTasks, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="md" label="Restoring session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-[calc(env(safe-area-inset-top,0px)+0.5rem)] focus:left-3 focus:z-[200] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-background"
      >
        Skip to main content
      </a>
      <DashboardHeader />
      <OfflineBanner />

      {/* Bottom padding clears the mobile tab bar + home indicator */}
      <main
        id="main-content"
        tabIndex={-1}
        className="outline-none max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1 mt-6 md:mt-8 space-y-8 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] md:pb-12"
      >
        {children}
      </main>

      <BottomNav />
      <TaskEditorModal />
      <WelcomeTour />

      {/* Interruptive prompts — coordinated so at most one shows at a time */}
      <NotificationPromptModal />
      <InstallPrompt />
    </div>
  );
}
