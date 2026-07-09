"use client";

import { useSearchParams } from "next/navigation";
import { AuthenticatedLayout } from "@/components/dashboard/AuthenticatedLayout";
import { TaskList } from "@/components/dashboard/TaskList";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/uiStore";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

function TasksPageContent() {
  const searchParams = useSearchParams();
  const selectedTaskId = searchParams.get("taskId");
  const { setShowCreateModal } = useUiStore();

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
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
        >
          + Add Task
        </Button>
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
