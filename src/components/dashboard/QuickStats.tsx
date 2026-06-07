"use client";

import { useTaskStore } from "@/store/taskStore";
import { cn } from "@/lib/utils";

export function QuickStats() {
  const tasks = useTaskStore((s) => s.tasks);
  const now = new Date();

  const overdueCount = tasks.filter(
    (t) => t.status !== "completed" && t.due_date && new Date(t.due_date).getTime() < now.getTime()
  ).length;

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const stats = [
    {
      title: "Overdue Tasks",
      value: overdueCount,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
      description: "Require immediate attention",
    },
    {
      title: "Active Tasks",
      value: pendingCount,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      description: "Remaining in checklist",
    },
    {
      title: "Completed",
      value: completedCount,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10 border-green-500/20",
      description: "Successfully checked off",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={cn(
            "p-5 rounded-xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-md",
            stat.bg
          )}
        >
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              {stat.title}
            </p>
            <p className={cn("text-3xl font-bold mt-2", stat.color)}>
              {stat.value}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-normal">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  );
}
