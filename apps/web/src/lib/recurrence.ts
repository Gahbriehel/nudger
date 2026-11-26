import type { Task } from "@/types/database.types";

export const RECURRING_RESET_WINDOW_HOURS = 6;

export function shouldResetRecurringTask(
  task: Task | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!task || task.task_type !== "recurring") return false;
  if (task.paused_at) return false; // paused tasks stay put until resumed
  if (task.status !== "completed" || !task.due_date) return false;

  const dueDate = new Date(task.due_date);
  if (Number.isNaN(dueDate.getTime())) return false;

  const resetThreshold = new Date(
    dueDate.getTime() - RECURRING_RESET_WINDOW_HOURS * 60 * 60 * 1000,
  );

  return now >= resetThreshold;
}

export function calculateInitialDueDate(
  startDate: Date,
  recurrenceDays: number[],
): string {
  const currentDay = startDate.getDay();
  if (recurrenceDays.includes(currentDay)) {
    return startDate.toISOString();
  }
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + i);
    if (recurrenceDays.includes(nextDate.getDay())) {
      return nextDate.toISOString();
    }
  }
  return startDate.toISOString();
}

export function calculateNextDueDate(
  dueDateStr: string | null,
  type: string,
  interval: number,
  recurrenceDays: number[] | null = null,
): string | null {
  if (!dueDateStr) return null;
  const date = new Date(dueDateStr);

  if (type === "weekly" && recurrenceDays && recurrenceDays.length > 0) {
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + i);
      if (recurrenceDays.includes(nextDate.getDay())) {
        return nextDate.toISOString();
      }
    }
  }

  const add = interval || 1;

  switch (type) {
    case "daily":
      date.setDate(date.getDate() + add);
      break;
    case "weekly":
      date.setDate(date.getDate() + add * 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + add);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + add);
      break;
    default:
      return null;
  }
  return date.toISOString();
}

export function calculateCatchUpDueDate(
  dueDateStr: string | null,
  type: string | null,
  interval: number | null,
  recurrenceDays: number[] | null = null,
  targetDate: Date = new Date(),
): string | null {
  if (!dueDateStr || !type) return null;
  let currentDueStr: string | null = dueDateStr;
  const maxSafetyIterations = 1000;
  let count = 0;

  while (currentDueStr && count < maxSafetyIterations) {
    const nextDue = calculateNextDueDate(
      currentDueStr,
      type,
      interval || 1,
      recurrenceDays,
    );
    if (!nextDue) break;
    currentDueStr = nextDue;

    if (new Date(currentDueStr).getTime() >= targetDate.getTime()) {
      break;
    }
    count++;
  }

  return currentDueStr;
}

/** A pause with an `paused_until` that has already passed (due to auto-resume). */
export function isPauseExpired(
  task: Pick<Task, "paused_at" | "paused_until">,
  now: number = Date.now(),
): boolean {
  return (
    !!task.paused_at &&
    !!task.paused_until &&
    new Date(task.paused_until).getTime() <= now
  );
}

/** True while a recurring task is paused (an elapsed `paused_until` doesn't count). */
export function isPausedAt(
  task: Pick<Task, "paused_at" | "paused_until">,
  now: number = Date.now(),
): boolean {
  if (!task.paused_at) return false;
  if (!task.paused_until) return true;
  return new Date(task.paused_until).getTime() > now;
}

/**
 * Fields to write when a paused recurring task resumes: the due date jumps to
 * the next occurrence from now (nothing is logged as missed), and the
 * reminder keeps its offset from the due date.
 */
export function computeResumeUpdate(
  task: Pick<
    Task,
    | "due_date"
    | "reminder_at"
    | "recurrence_type"
    | "recurrence_interval"
    | "recurrence_days"
    | "status"
  >,
  now: Date = new Date(),
): Partial<Task> {
  const cleared: Partial<Task> = {
    paused_at: null,
    paused_until: null,
    due_sent: false,
    reminder_sent: false,
  };
  if (!task.due_date || !task.recurrence_type) return cleared;

  const oldDue = new Date(task.due_date).getTime();
  const newDue =
    oldDue >= now.getTime()
      ? task.due_date
      : calculateCatchUpDueDate(
          task.due_date,
          task.recurrence_type,
          task.recurrence_interval || 1,
          task.recurrence_days,
          now,
        );
  if (!newDue) return cleared;

  let reminder = task.reminder_at;
  if (task.reminder_at) {
    const offset = oldDue - new Date(task.reminder_at).getTime();
    reminder = new Date(new Date(newDue).getTime() - offset).toISOString();
  }

  return {
    ...cleared,
    due_date: newDue,
    reminder_at: reminder,
    // Back to pending when the next occurrence is already within the lead-up window
    status:
      task.status === "completed" &&
      new Date(newDue).getTime() - now.getTime() <=
        RECURRING_RESET_WINDOW_HOURS * 3600_000
        ? "pending"
        : task.status,
  };
}
