"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { useUiStore } from "@/store/uiStore";
import { AuthenticatedLayout } from "@/components/dashboard/AuthenticatedLayout";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { Button } from "@/components/ui/button";
import { format } from "@/lib/date-fns";
import { cn } from "@/lib/utils";
import { Task } from "@/types/database.types";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tasks, fetchTasks, loading: tasksLoading } = useTaskStore();
  const { setShowCreateModal } = useUiStore();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  // Stats are shown by default on md+ screens; hidden on mobile
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Get top 3 urgent tasks for summary
  const nowTime = currentTime ? currentTime.getTime() : null;
  const urgentTasks =
    nowTime === null
      ? []
      : tasks
          .filter((t: Task) => t.status !== "completed")
          .filter((t: Task) => {
            const isOverdue =
              t.due_date && new Date(t.due_date).getTime() < nowTime;
            const lastUpdatedTime = new Date(
              t.updated_at || t.created_at,
            ).getTime();
            const daysSinceInteraction =
              (nowTime - lastUpdatedTime) / (24 * 60 * 60 * 1000);
            return isOverdue || daysSinceInteraction >= 3;
          })
          .slice(0, 3);

  // Get 3 recently updated tasks
  const recentTasks = [...tasks]
    .sort(
      (a: Task, b: Task) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 3);

  return (
    <AuthenticatedLayout>
      <div className="space-y-8">
        {/* Welcoming and Digital Clock banner */}
        <div className="relative overflow-hidden border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hello,{" "}
              {user?.user_metadata?.name ||
                user?.email?.split("@")[0] ||
                "User"}
            </h1>
            <p className="text-xs text-muted-foreground leading-normal max-w-md">
              Keep your mind clear. Offload temporary details, schedules, and
              cues to the system.
            </p>
          </div>

          {currentTime && (
            <div className="text-right flex flex-col md:items-end justify-center">
              <span className="text-2xl font-bold tracking-wider text-foreground">
                {format(currentTime, "HH:mm")}
              </span>
              <span className="text-xs text-muted-foreground font-semibold mt-1">
                {format(currentTime, "MMMM dd, yyyy")}
              </span>
            </div>
          )}
        </div>

        {/* Quick Stats Grid */}
        {/* Mobile: toggle show/hide. On md+ always show via CSS */}
        <div>
          {/* Toggle button – visible only on mobile */}
          <button
            id="toggle-stats-btn"
            onClick={() => setShowStats((prev) => !prev)}
            className={cn(
              "md:hidden w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-semibold transition-all duration-200 mb-3 shadow-sm",
              showStats
                ? "bg-muted border-border text-foreground"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50",
            )}
          >
            <div className="flex items-center gap-2.5">
              {/* Bar chart icon */}
              <svg
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  showStats ? "text-foreground" : "text-muted-foreground",
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>{showStats ? "Hide Stats" : "View Stats"}</span>
            </div>
            <svg
              className={cn(
                "w-4 h-4 flex-shrink-0 transition-transform duration-300",
                showStats ? "rotate-180" : "",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Stats grid: hidden on mobile unless showStats, always visible md+ */}
          <div className={cn("md:block", showStats ? "block" : "hidden")}>
            <QuickStats />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 items-center">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-5 rounded-lg text-xs"
          >
            + Create New Task
          </Button>
          <Link href="/nudgelist">
            <Button
              variant="outline"
              className="font-semibold h-10 px-5 rounded-lg text-xs"
            >
              Review Nudgelist
            </Button>
          </Link>
          <button
            id="dashboard-refresh-btn"
            onClick={() => fetchTasks()}
            disabled={tasksLoading}
            title="Refresh tasks"
            className="ml-auto h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <svg
              className={cn("w-4 h-4", tasksLoading && "animate-spin")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Dashboard Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgent Action / Nudges Summary */}
          <div className="border border-border bg-card backdrop-blur-md p-5 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                Urgent Nudges
              </h2>
              <Link
                href="/nudgelist"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
              </Link>
            </div>

            {urgentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs bg-muted/30 rounded-xl border border-border border-dashed">
                No urgent tasks to display.
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentTasks.map((t: Task) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      router.push(`/tasks?taskId=${t.id}`);
                    }}
                    className="bg-muted/40 border border-border hover:border-foreground/20 p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-200"
                  >
                    <div className="space-y-0.5 truncate">
                      <p className="font-bold text-xs text-foreground truncate">
                        {t.title}
                      </p>
                      {t.due_date && (
                        <p className="text-[10px] text-red-500 dark:text-red-400">
                          Due: {format(t.due_date, "PP")}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full uppercase font-medium">
                      Nudge
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activities */}
          <div className="border border-border bg-card backdrop-blur-md p-5 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                Recently Updated
              </h2>
              <Link
                href="/tasks"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs bg-muted/30 rounded-xl border border-border border-dashed">
                No tasks created yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentTasks.map((t: Task) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      router.push(`/tasks?taskId=${t.id}`);
                    }}
                    className="bg-muted/40 border border-border hover:border-foreground/20 p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-200"
                  >
                    <div className="space-y-0.5 truncate">
                      <p className="font-bold text-xs text-foreground truncate">
                        {t.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Updated: {format(t.updated_at, "PP")}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full uppercase font-medium",
                        t.status === "completed"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                          : "bg-muted text-muted-foreground border border-border",
                      )}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
