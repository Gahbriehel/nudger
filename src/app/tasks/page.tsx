"use client";

import { useSearchParams } from "next/navigation";
import { AuthenticatedLayout } from "@/components/dashboard/AuthenticatedLayout";
import { TaskList } from "@/components/dashboard/TaskList";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/uiStore";
import { useTaskStore } from "@/store/taskStore";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

function TasksPageContent() {
  const searchParams = useSearchParams();
  const selectedTaskId = searchParams.get("taskId");
  const { setShowCreateModal } = useUiStore();
  const { fetchTasks, loading: tasksLoading } = useTaskStore();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your Tasks
          </h1>
          <p className="text-xs text-muted-foreground mt-1 leading-normal">
            View, filter, sort, and manage all your productivity items.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
          >
            + Add Task
          </Button>
          <button
            id="tasks-refresh-btn"
            onClick={() => fetchTasks()}
            disabled={tasksLoading}
            title="Refresh tasks"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
      </div>
      <TaskList
        key={selectedTaskId ?? "default"}
        initialExpandedTaskId={selectedTaskId}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <AuthenticatedLayout>
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-12">
            <Spinner size="md" label="Loading tasks..." />
          </div>
        }
      >
        <TasksPageContent />
      </Suspense>
    </AuthenticatedLayout>
  );
}
