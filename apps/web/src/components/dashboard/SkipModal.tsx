"use client";

import { useState } from "react";
import { Task } from "@/types/database.types";
import { Modal } from "@/components/ui/modal";
import { taskService } from "@/services/task.service";
import { toast } from "sonner";
import { SkipForward, FastForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkipModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSuccess: () => void;
}

export function SkipModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: SkipModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipStatus, setSkipStatus] = useState<"skipped" | "missed">("skipped");

  if (!task) return null;

  const handleSkip = async (mode: "single" | "catch_up") => {
    setIsSubmitting(true);
    try {
      await taskService.skipTask(task, mode, skipStatus);
      toast.success(
        mode === "catch_up"
          ? "Caught up! Task skipped to current occurrence."
          : "Occurrence skipped! Next due date scheduled.",
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error skipping task:", err);
      toast.error("Failed to skip task occurrence");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverdue =
    task.due_date && new Date(task.due_date).getTime() < Date.now();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Skip Recurring Occurrence"
      description={`Choose how you'd like to handle "${task.title}". This won't count as a completed task.`}
      isLoading={isSubmitting}
    >
      <div className="w-full space-y-4 py-2">
        {/* Status Selection (Skipped vs Missed) */}
        <div className="flex items-center justify-between p-2.5 bg-muted/40 border border-border rounded-xl">
          <span className="text-xs font-semibold text-muted-foreground">
            Log Action As:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSkipStatus("skipped")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                skipStatus === "skipped"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Skipped
            </button>
            <button
              type="button"
              onClick={() => setSkipStatus("missed")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                skipStatus === "missed"
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Missed
            </button>
          </div>
        </div>

        {/* Skip Options */}
        <div className="grid grid-cols-1 gap-3">
          {/* Single Skip */}
          <button
            onClick={() => handleSkip("single")}
            disabled={isSubmitting}
            className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-amber-500/40 transition-all text-left disabled:opacity-50 group shadow-sm"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
              <SkipForward className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Skip 1 Occurrence
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Advances the task by one recurrence interval (
                {task.recurrence_type || "interval"}).
              </p>
            </div>
          </button>

          {/* Catch-Up Skip */}
          <button
            onClick={() => handleSkip("catch_up")}
            disabled={isSubmitting}
            className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-indigo-500/40 transition-all text-left disabled:opacity-50 group shadow-sm"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
              <FastForward className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                Catch Up to Today
                {isOverdue && (
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
                    Recommended
                  </span>
                )}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Skip all past missed occurrences and advance due date straight
                to today/next scheduled occurrence.
              </p>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
}
