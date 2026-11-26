"use client";

import { useEffect, useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import { cn } from "@/lib/utils";
import { isPausedAt } from "@/lib/recurrence";

const isSameDay = (iso: string | null | undefined, ref: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

/** Compact "today at a glance" counters. */
export function QuickStats() {
  const tasks = useTaskStore((s) => s.tasks);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pending = tasks.filter(
    (t) => t.status !== "completed" && !isPausedAt(t),
  );
  const overdue = now
    ? pending.filter(
        (t) => t.due_date && new Date(t.due_date).getTime() < now.getTime(),
      ).length
    : 0;
  const dueToday = now
    ? pending.filter(
        (t) =>
          isSameDay(t.due_date, now) &&
          new Date(t.due_date!).getTime() >= now.getTime(),
      ).length
    : 0;
  const doneToday = now
    ? tasks.filter(
        (t) =>
          isSameDay(t.completed_at, now) || isSameDay(t.last_completed_at, now),
      ).length
    : 0;

  const stats = [
    {
      label: "Overdue",
      value: overdue,
      color: overdue
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground",
      bg: overdue ? "bg-red-500/10 border-red-500/20" : "bg-card border-border",
    },
    {
      label: "Due today",
      value: dueToday,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Done today",
      value: doneToday,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10 border-green-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "px-3 py-3 sm:p-5 rounded-xl border shadow-sm",
            stat.bg,
          )}
        >
          <p className={cn("text-2xl sm:text-3xl font-bold", stat.color)}>
            {now ? stat.value : "–"}
          </p>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
