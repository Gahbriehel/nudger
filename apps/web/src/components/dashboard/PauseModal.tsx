"use client";

import { useState } from "react";
import { PauseCircle } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/types/database.types";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { taskService } from "@/services/task.service";
import { cn } from "@/lib/utils";

interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSuccess: () => void;
}

const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export function PauseModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: PauseModalProps) {
  const [mode, setMode] = useState<"manual" | "date">("manual");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  if (!task) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = toInputDate(tomorrow);
  const dateInvalid = mode === "date" && (!date || date < minDate);

  const close = () => {
    setMode("manual");
    setDate("");
    onClose();
  };

  const confirm = async () => {
    if (dateInvalid) {
      toast.error("Pick a date from tomorrow onwards");
      return;
    }
    // Resume at the start of the chosen day, local time
    const until = mode === "date" ? new Date(`${date}T00:00:00`) : null;
    setSaving(true);
    try {
      await taskService.pauseTask(task.id, until);
      toast.success(
        until
          ? `Paused until ${until.toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
            })}`
          : "Paused. Resume it whenever you're ready.",
      );
      onSuccess();
      close();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't pause this task");
    } finally {
      setSaving(false);
    }
  };

  const option = (value: "manual" | "date", title: string, body: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-colors min-h-11",
        mode === value
          ? "border-foreground bg-muted/50"
          : "border-border hover:bg-muted/40",
      )}
    >
      <span className="block text-sm font-bold text-foreground">{title}</span>
      <span className="block text-xs text-muted-foreground mt-0.5">{body}</span>
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={
        <span className="flex items-center justify-center gap-2">
          <PauseCircle className="w-5 h-5" /> Pause &ldquo;{task.title}&rdquo;
        </span>
      }
      description="No reminders, nothing goes overdue, and nothing is logged as missed while it's paused."
      confirmText="Pause"
      onConfirm={confirm}
      isLoading={saving}
    >
      <div className="w-full space-y-3 py-2">
        {option(
          "manual",
          "Until I resume it",
          "Stays paused until you turn it back on.",
        )}
        {option(
          "date",
          "Until a date",
          "Resumes on its own, at the next occurrence after that day.",
        )}
        {mode === "date" && (
          <Input
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Resume on"
            className="h-11 text-base md:text-sm rounded-xl"
          />
        )}
      </div>
    </Modal>
  );
}
