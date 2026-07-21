"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTaskStore } from "@/store/taskStore";
import { taskService } from "@/services/task.service";
import { nudgelistService, NudgelistData } from "@/services/nudgelist.service";
import { Task } from "@/types/database.types";
import { format } from "@/lib/date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Sparkles, ExternalLink } from "lucide-react";
import { SnoozeModal } from "./SnoozeModal";

export function NudgelistView() {
  const router = useRouter();
  const { fetchTasks } = useTaskStore();
  const [data, setData] = useState<NudgelistData>({
    overdue: [],
    forgotten: [],
    stale: [],
  });
  const [loading, setLoading] = useState(false);

  const loadNudgelist = async () => {
    setLoading(true);
    try {
      const result = await nudgelistService.getNudgelist();
      setData(result);
    } catch (err) {
      console.error("Failed to load nudgelist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNudgelist();
  }, []);

  const handleComplete = async (task: Task) => {
    try {
      await taskService.completeTask(task);
      await fetchTasks(); // Sync main task store
      await loadNudgelist(); // Reload nudgelist
      toast.success("Task completed!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete task");
    }
  };

  const [snoozeTask, setSnoozeTask] = useState<Task | null>(null);

  const handleSnoozeSuccess = async () => {
    await fetchTasks();
    await loadNudgelist();
  };

  const handleAcknowledge = async (task: Task) => {
    try {
      // Touching the task updates `updated_at`, resetting its stale timer
      await taskService.updateTask(task.id, {
        updated_at: new Date().toISOString(),
      });
      await fetchTasks();
      await loadNudgelist();
      toast.success("Task acknowledged");
    } catch (err) {
      console.error(err);
      toast.error("Failed to acknowledge task");
    }
  };

  const renderSection = (
    title: string,
    tasks: Task[],
    type: "overdue" | "forgotten" | "stale",
    badgeColor: string,
    intro: string,
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-foreground">{title}</h3>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-bold",
              badgeColor,
            )}
          >
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-normal">{intro}</p>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border border-border bg-card backdrop-blur-sm p-4 rounded-xl flex flex-col gap-4 shadow-md"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => router.push(`/tasks?taskId=${task.id}`)}
                    className="font-bold text-sm text-foreground hover:text-brand-indigo dark:hover:text-brand-blue flex items-center gap-1.5 group text-left transition-colors"
                    title="View task details in task list"
                  >
                    <span>{task.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity text-muted-foreground group-hover:text-brand-indigo dark:group-hover:text-brand-blue" />
                  </button>
                  <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-full uppercase">
                    {task.task_type}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {task.description}
                  </p>
                )}
                {task.due_date && (
                  <p className="text-[10px] text-muted-foreground">
                    Was due: {format(task.due_date, "MMM dd, yyyy HH:mm")}
                  </p>
                )}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.tags.map((t) => (
                      <span
                        key={t.id}
                        className="text-[9px] text-muted-foreground"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons - Responsive Grid */}
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                <Button
                  onClick={() => router.push(`/tasks?taskId=${task.id}`)}
                  variant="outline"
                  className="text-xs py-1 h-8 rounded px-3 border-border hover:bg-muted text-foreground flex items-center justify-center gap-1.5 md:w-auto"
                  title="View task details in task list"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View
                </Button>

                <Button
                  onClick={() => handleComplete(task)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-1 h-8 rounded px-3 flex items-center justify-center md:w-auto"
                >
                  Complete
                </Button>

                {type === "overdue" ? (
                  <Button
                    onClick={() => setSnoozeTask(task)}
                    variant="outline"
                    className="text-xs py-1 h-8 rounded px-3 flex items-center justify-center md:w-auto"
                  >
                    Snooze
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleAcknowledge(task)}
                    variant="outline"
                    className="text-xs py-1 h-8 rounded px-3 flex items-center justify-center md:w-auto col-span-2 sm:col-span-1"
                    title="Updates the task's timestamp to keep it off the nudgelist"
                  >
                    Acknowledge (Reset Timer)
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalNudges =
    data.overdue.length + data.forgotten.length + data.stale.length;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="md" label="Analyzing task timelines..." />
        </div>
      ) : totalNudges === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-muted/20 flex flex-col items-center justify-center p-6 space-y-3">
          <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
          <p className="font-bold text-sm text-foreground">
            Your mind is clear!
          </p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            All tasks are up-to-date. No overdue, forgotten, or stale items
            require nudging.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderSection(
            "Overdue Tasks",
            data.overdue,
            "overdue",
            "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30",
            "These tasks have deadlines in the past. Snooze them to reset their deadline or complete them to clear them.",
          )}

          {renderSection(
            "Forgotten Tasks",
            data.forgotten,
            "forgotten",
            "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
            "You haven't interacted with or updated these pending tasks in over a week. Acknowledge them to keep them in your rotation.",
          )}

          {renderSection(
            "Stale Tasks",
            data.stale,
            "stale",
            "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30",
            "These pending tasks have had no updates in the past 3 to 7 days. Give them a quick check or touch.",
          )}
        </div>
      )}

      <SnoozeModal
        isOpen={!!snoozeTask}
        onClose={() => setSnoozeTask(null)}
        task={snoozeTask}
        onSuccess={handleSnoozeSuccess}
      />
    </div>
  );
}
