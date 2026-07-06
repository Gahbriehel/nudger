"use client";

import { useState } from "react";
import { Task } from "@/types/database.types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { taskService } from "@/services/task.service";
import { toast } from "sonner";
import { Clock, Calendar, ChevronRight } from "lucide-react";

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSuccess: () => void;
}

type SnoozePreset = {
  label: string;
  durationMs: number;
  icon: React.ReactNode;
};

export function SnoozeModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: SnoozeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("4");
  const [customUnit, setCustomUnit] = useState<"hours" | "days">("hours");

  if (!task) return null;

  const presets: SnoozePreset[] = [
    {
      label: "2 Hours",
      durationMs: 2 * 60 * 60 * 1000,
      icon: <Clock className="w-4 h-4 text-indigo-500" />,
    },
    {
      label: "3 Hours",
      durationMs: 3 * 60 * 60 * 1000,
      icon: <Clock className="w-4 h-4 text-purple-500" />,
    },
    {
      label: "Tomorrow (24h)",
      durationMs: 24 * 60 * 60 * 1000,
      icon: <Calendar className="w-4 h-4 text-emerald-500" />,
    },
    {
      label: "1 Week",
      durationMs: 7 * 24 * 60 * 60 * 1000,
      icon: <Calendar className="w-4 h-4 text-blue-500" />,
    },
  ];

  const handleSnooze = async (ms: number) => {
    setIsSubmitting(true);
    try {
      const nextTime = new Date(Date.now() + ms).toISOString();

      // Update both due_date and reminder_at to ensure notification resets properly
      await taskService.updateTask(task.id, {
        due_date: nextTime,
        reminder_at: nextTime,
        status: "pending",
        task_type: "scheduled", // Convert to scheduled so it has a valid target due date
      });

      toast.success("Task snoozed successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to snooze task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid number");
      return;
    }

    const unitMs =
      customUnit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    handleSnooze(val * unitMs);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Snooze Task"
      description={`Postpone "${task.title}" to a later time.`}
      isLoading={isSubmitting}
    >
      <div className="w-full space-y-4 py-2">
        {!customMode ? (
          <>
            <div className="grid grid-cols-1 gap-2.5">
              {presets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleSnooze(preset.durationMs)}
                  disabled={isSubmitting}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/80 hover:border-muted-foreground/30 transition-all duration-200 text-left disabled:opacity-50 select-none group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-card border border-border shadow-sm group-hover:scale-105 transition-transform">
                      {preset.icon}
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {preset.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomMode(true)}
              className="w-full h-10 rounded-xl text-xs font-semibold select-none bg-muted/10"
            >
              Custom Snooze Time...
            </Button>
          </>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label
                  htmlFor="snooze-amount"
                  className="block text-[11px] font-bold text-muted-foreground uppercase mb-1.5"
                >
                  Amount
                </label>
                <input
                  id="snooze-amount"
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-foreground text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                  placeholder="e.g. 3"
                />
              </div>

              <div className="w-1/3">
                <label
                  htmlFor="snooze-unit"
                  className="block text-[11px] font-bold text-muted-foreground uppercase mb-1.5"
                >
                  Unit
                </label>
                <select
                  id="snooze-unit"
                  value={customUnit}
                  onChange={(e) =>
                    setCustomUnit(e.target.value as "hours" | "days")
                  }
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary select-none cursor-pointer"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomMode(false)}
                className="flex-1 h-10 rounded-xl text-sm font-medium"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-10 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Snooze
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
