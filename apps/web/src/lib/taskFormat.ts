import type { Subtask, Task, TaskType } from "@/types/database.types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  flexible: "Flexible",
  scheduled: "Scheduled",
  recurring: "Recurring",
};

/** Badge colours per task type (light + dark). */
export const TASK_TYPE_BADGE: Record<TaskType, string> = {
  flexible:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  scheduled:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
  recurring:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
};

/** Left accent border per task type. */
export const TASK_TYPE_ACCENT: Record<TaskType, string> = {
  flexible: "border-l-sky-500",
  scheduled: "border-l-rose-500",
  recurring: "border-l-violet-500",
};

/** e.g. "Mon, Wed, Fri" — ordered Monday-first. */
export function weekdaysLabel(days: number[]): string {
  return [...days]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => DAY_NAMES[d])
    .join(", ");
}

/** Human description of a recurring task's schedule, or null. */
export function recurrenceLabel(task: Task): string | null {
  if (task.task_type !== "recurring" || !task.recurrence_type) return null;
  if (task.recurrence_days?.length) {
    return `Every ${weekdaysLabel(task.recurrence_days)}`;
  }
  const n = task.recurrence_interval || 1;
  const unit = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    yearly: "year",
  }[task.recurrence_type];
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
}

export function isOverdue(task: Task, now: number = Date.now()): boolean {
  return (
    task.status !== "completed" &&
    !!task.due_date &&
    new Date(task.due_date).getTime() < now
  );
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Friendly date/time in the user's locale: "Today, 14:00", "Tomorrow, 09:30",
 * "Yesterday, 18:00", "Fri 12 Dec, 10:00" (year only when not this year).
 */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayDiff = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  if (dayDiff === -1) return `Yesterday, ${time}`;
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${date}, ${time}`;
}

/**
 * Splits a checklist into what's left (in list order) and what's done, so
 * open items are never buried among ticked ones.
 */
export function splitChecklist(subs: Subtask[] | undefined | null): {
  open: Subtask[];
  done: Subtask[];
} {
  const sorted = [...(subs ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    open: sorted.filter((s) => !s.completed),
    done: sorted.filter((s) => s.completed),
  };
}
