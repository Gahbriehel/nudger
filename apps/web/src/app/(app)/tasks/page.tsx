"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { TaskList } from "@/components/dashboard/TaskList";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useUiStore } from "@/store/uiStore";
import { useTaskStore } from "@/store/taskStore";
import { cn } from "@/lib/utils";

function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyTaskId = searchParams.get("taskId");
  const openCreateTask = useUiStore((s) => s.openCreateTask);
  const { fetchTasks, loading, refreshing } = useTaskStore();

  // Old deep links (/tasks?taskId=…) now live at /tasks/[id]
  useEffect(() => {
    if (legacyTaskId) router.replace(`/tasks/${legacyTaskId}`);
  }, [legacyTaskId, router]);

  return (
    <div className="space-y-6">
      <title>Tasks · Nudger</title>
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything you&apos;ve offloaded, in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* On phones the floating + button handles this */}
          <Button
            onClick={openCreateTask}
            className="hidden md:inline-flex font-semibold text-sm h-10 px-4 rounded-lg"
          >
            + Add Task
          </Button>
          <button
            id="tasks-refresh-btn"
            onClick={() => fetchTasks()}
            disabled={loading || refreshing}
            aria-label="Refresh tasks"
            className="h-11 w-11 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4",
                (loading || refreshing) && "animate-spin",
              )}
            />
          </button>
        </div>
      </div>
      <TaskList />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <Spinner size="md" label="Loading tasks..." />
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
