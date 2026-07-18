"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { useUiStore } from "@/store/uiStore";
import { authService } from "@/services/auth.service";
import { DashboardHeader } from "./DashboardHeader";
import { PwaInstallBanner } from "./PwaInstallBanner";
import { NotificationPromptModal } from "./NotificationPromptModal";
import { useNotificationChecker } from "@/hooks/useNotificationChecker";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { Spinner } from "@/components/ui/spinner";
import { TaskForm } from "./TaskForm";

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setSession, setLoading, loading: authLoading } = useAuthStore();
  const { fetchTasks } = useTaskStore();
  const { showCreateModal, setShowCreateModal } = useUiStore();

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="md" label="Restoring session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-12">
      <DashboardHeader />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1 mt-8 space-y-8">
        <PwaInstallBanner />
        <NotificationPromptModal />
        {children}
      </main>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          {/* Modal Container */}
          <div className="relative border border-border bg-card backdrop-blur-md w-full max-w-lg rounded-[24px] shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-foreground/5 dark:bg-foreground/10 text-foreground rounded-xl">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    Create Memory Task
                  </h2>
                  <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                    Offload temporary details, schedules, and cues to the
                    system.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 p-1.5 rounded-full transition-colors select-none"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto pr-1">
              <TaskForm
                onSuccess={() => setShowCreateModal(false)}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
