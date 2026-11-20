import { Task } from "@/types/database.types";

export interface NudgeBuckets {
  /** Past their due date. */
  overdue: Task[];
  /** Not touched for 7+ days. */
  forgotten: Task[];
  /** Not touched for 3–7 days. */
  stale: Task[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Single source of truth for "which pending tasks need attention". */
export function getNudgeBuckets(
  tasks: Task[],
  now: number = Date.now(),
): NudgeBuckets {
  const buckets: NudgeBuckets = { overdue: [], forgotten: [], stale: [] };

  for (const task of tasks) {
    if (task.status === "completed") continue;

    const isOverdue =
      !!task.due_date && new Date(task.due_date).getTime() < now;
    const lastTouched = new Date(task.updated_at || task.created_at).getTime();
    const idleDays = (now - lastTouched) / DAY_MS;

    if (isOverdue) buckets.overdue.push(task);
    else if (idleDays >= 7) buckets.forgotten.push(task);
    else if (idleDays >= 3) buckets.stale.push(task);
  }

  return buckets;
}

export function countNudges(buckets: NudgeBuckets): number {
  return (
    buckets.overdue.length + buckets.forgotten.length + buckets.stale.length
  );
}
