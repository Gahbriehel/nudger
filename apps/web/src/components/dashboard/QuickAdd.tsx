"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, SlidersHorizontal } from "lucide-react";
import { taskService } from "@/services/task.service";
import { useTaskStore } from "@/store/taskStore";
import { usePromptStore } from "@/store/promptStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toInputDateTime } from "./TaskEditor";

type When = "none" | "later" | "tomorrow" | "pick";

/** Next sensible slots: ~3h from now (on the hour) and tomorrow 09:00. */
function useWhenSlots() {
  return useMemo(() => {
    const now = new Date();
    const later = new Date(now);
    later.setMinutes(0, 0, 0);
    later.setHours(later.getHours() + 3);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return {
      // Hide "Later today" late in the evening
      later: later.getDate() === now.getDate() ? later : null,
      tomorrow,
    };
  }, []);
}

const timeLabel = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/**
 * Fast capture: a title and (optionally) when. Everything else lives behind
 * "More options", which opens the full editor with this input carried over.
 */
export function QuickAdd({
  onSaved,
  onMoreOptions,
  onDirtyChange,
}: {
  onSaved: () => void;
  onMoreOptions: (draft: { title: string; due_date: string }) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const addTaskState = useTaskStore((s) => s.addTaskState);
  const slots = useWhenSlots();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<When>("none");
  const [picked, setPicked] = useState("");
  const [saving, setSaving] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  // Choosing "Pick…" opens the native picker straight away where the browser
  // allows it (still inside the tap's user activation); otherwise the
  // labelled field below makes the next step obvious.
  useEffect(() => {
    if (when !== "pick") return;
    const input = pickerRef.current;
    if (!input) return;
    try {
      input.showPicker?.();
    } catch {
      input.focus();
    }
  }, [when]);

  useEffect(() => {
    onDirtyChange(!!title.trim());
  }, [title, onDirtyChange]);

  const dueDate: Date | null =
    when === "later"
      ? slots.later
      : when === "tomorrow"
        ? slots.tomorrow
        : when === "pick" && picked
          ? new Date(picked)
          : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = title.trim();
    if (!text || saving) return;
    if (when === "pick" && !picked) {
      toast.error("Pick a date and time, or choose another option.");
      return;
    }
    if (dueDate && dueDate.getTime() < Date.now() - 60_000) {
      toast.error("That time has already passed.");
      return;
    }

    setSaving(true);
    try {
      const task = await taskService.createTask(
        {
          title: text,
          description: null,
          task_type: dueDate ? "scheduled" : "flexible",
          due_date: dueDate ? dueDate.toISOString() : null,
          reminder_at: null,
          recurrence_type: null,
          recurrence_interval: null,
          recurrence_days: null,
          notes: null,
        },
        [],
        [],
        [],
      );
      addTaskState(task);
      onSaved();
      toast.success("Task added", {
        action: {
          label: "View",
          onClick: () => router.push(`/tasks/${task.id}`),
        },
      });
      if (dueDate) {
        usePromptStore.getState().requestContextualNotificationAsk(task.title);
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't add the task. Please try again.");
      setSaving(false);
    }
  };

  const chips: { id: When; label: string; hidden?: boolean }[] = [
    { id: "none", label: "No date" },
    {
      id: "later",
      label: slots.later ? `Later · ${timeLabel(slots.later)}` : "",
      hidden: !slots.later,
    },
    { id: "tomorrow", label: `Tomorrow · ${timeLabel(slots.tomorrow)}` },
    { id: "pick", label: "Pick…" },
  ];

  return (
    <form onSubmit={submit} className="space-y-4 pb-2">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What do you need to remember?"
        aria-label="Task title"
        enterKeyHint="done"
        className="h-12 text-base rounded-xl"
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">When</p>
        <div className="flex flex-wrap gap-1.5">
          {chips
            .filter((c) => !c.hidden)
            .map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setWhen(chip.id)}
                aria-pressed={when === chip.id}
                className={cn(
                  "h-9 px-3 rounded-full text-xs font-semibold border transition-colors",
                  when === chip.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            ))}
        </div>
        {when === "pick" && (
          <label className="block space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Due date and time
            </span>
            <span className="relative block">
              <Input
                ref={pickerRef}
                type="datetime-local"
                value={picked}
                min={toInputDateTime(new Date().toISOString())}
                onChange={(e) => setPicked(e.target.value)}
                className={cn(
                  "h-11 text-base md:text-sm",
                  // Hide the browser's empty mask behind our own hint
                  !picked && "text-transparent",
                )}
              />
              {!picked && (
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-2 text-base md:text-sm text-muted-foreground">
                  <CalendarClock className="w-4 h-4" />
                  Tap to choose a date and time
                </span>
              )}
            </span>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() =>
            onMoreOptions({
              title,
              due_date: dueDate ? toInputDateTime(dueDate.toISOString()) : "",
            })
          }
          className="flex items-center gap-1.5 h-11 px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="w-4 h-4" />
          More options
        </button>
        <Button
          type="submit"
          disabled={!title.trim() || saving}
          className="h-11 px-6 rounded-xl font-semibold"
        >
          {saving ? <Spinner size="sm" /> : "Add task"}
        </Button>
      </div>
    </form>
  );
}
