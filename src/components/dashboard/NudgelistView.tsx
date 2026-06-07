"use client";

import { useState, useEffect } from "react";
import { useTaskStore } from "@/store/taskStore";
import { taskService } from "@/services/task.service";
import { nudgelistService, NudgelistData } from "@/services/nudgelist.service";
import { Task } from "@/types/database.types";
import { format } from "@/lib/date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NudgelistView() {
  const { fetchTasks } = useTaskStore();
  const [data, setData] = useState<NudgelistData>({ overdue: [], forgotten: [], stale: [] });
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
    } catch (err) {
      console.error(err);
      alert("Failed to complete task");
    }
  };

  const handleSnooze = async (task: Task, days: number) => {
    try {
      const nextDue = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      await taskService.updateTask(task.id, {
        due_date: nextDue,
        status: "pending",
        task_type: "scheduled", // Convert to scheduled if it was flexible so it has a due date
      });
      await fetchTasks();
      await loadNudgelist();
    } catch (err) {
      console.error(err);
      alert("Failed to snooze task");
    }
  };

  const handleAcknowledge = async (task: Task) => {
    try {
      // Touching the task updates `updated_at`, resetting its stale timer
      await taskService.updateTask(task.id, {
        updated_at: new Date().toISOString(),
      });
      await fetchTasks();
      await loadNudgelist();
    } catch (err) {
      console.error(err);
      alert("Failed to acknowledge task");
    }
  };

  const renderSection = (
    title: string,
    tasks: Task[],
    type: "overdue" | "forgotten" | "stale",
    badgeColor: string,
    intro: string
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-foreground">{title}</h3>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold", badgeColor)}>
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-normal">{intro}</p>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border border-border bg-card backdrop-blur-sm p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-foreground">{task.title}</span>
                  <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-full uppercase">
                    {task.task_type}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                )}
                {task.due_date && (
                  <p className="text-[10px] text-muted-foreground">
                    Was due: {format(task.due_date, "MMM dd, yyyy HH:mm")}
                  </p>
                )}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.tags.map((t) => (
                      <span key={t.id} className="text-[9px] text-muted-foreground">
                        #{t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  onClick={() => handleComplete(task)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-1 h-8 rounded px-3"
                >
                  Complete
                </Button>

                {type === "overdue" ? (
                  <>
                    <Button
                      onClick={() => handleSnooze(task, 1)}
                      variant="outline"
                      className="text-xs py-1 h-8 rounded px-3"
                    >
                      Snooze 1d
                    </Button>
                    <Button
                      onClick={() => handleSnooze(task, 7)}
                      variant="outline"
                      className="text-xs py-1 h-8 rounded px-3"
                    >
                      Snooze 1w
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleAcknowledge(task)}
                    variant="outline"
                    className="text-xs py-1 h-8 rounded px-3"
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

  const totalNudges = data.overdue.length + data.forgotten.length + data.stale.length;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Analyzing tasks status...
        </div>
      ) : totalNudges === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-muted/20 flex flex-col items-center justify-center p-6 space-y-3">
          <span className="text-3xl">🎉</span>
          <p className="font-bold text-sm text-foreground">Your mind is clear!</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            All tasks are up-to-date. No overdue, forgotten, or stale items require nudging.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderSection(
            "Overdue Tasks",
            data.overdue,
            "overdue",
            "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30",
            "These tasks have deadlines in the past. Snooze them to reset their deadline or complete them to clear them."
          )}

          {renderSection(
            "Forgotten Tasks",
            data.forgotten,
            "forgotten",
            "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
            "You haven't interacted with or updated these pending tasks in over a week. Acknowledge them to keep them in your rotation."
          )}

          {renderSection(
            "Stale Tasks",
            data.stale,
            "stale",
            "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30",
            "These pending tasks have had no updates in the past 3 to 7 days. Give them a quick check or touch."
          )}
        </div>
      )}
    </div>
  );
}
