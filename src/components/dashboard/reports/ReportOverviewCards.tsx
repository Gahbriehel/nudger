"use client";

import { ReportData } from "@/types/database.types";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Repeat,
  ListChecks,
  Flame,
} from "lucide-react";

interface ReportOverviewCardsProps {
  report: ReportData;
}

export function ReportOverviewCards({ report }: ReportOverviewCardsProps) {
  const { metrics, timeframe } = report;
  const isWeekly = timeframe.period === "weekly";
  const numDays = isWeekly ? 7 : 30;
  const dailyAverage =
    metrics.totalCompleted > 0
      ? (metrics.totalCompleted / numDays).toFixed(1)
      : "0";

  const cards = [
    {
      title: "Completion Rate",
      value: `${metrics.completionRate}%`,
      subtitle:
        metrics.completionRateDelta !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold text-[11px]",
              metrics.completionRateDelta >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {metrics.completionRateDelta >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {metrics.completionRateDelta >= 0 ? "+" : ""}
            {metrics.completionRateDelta}% vs last {isWeekly ? "week" : "month"}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Base measurement
          </span>
        ),
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Tasks Completed",
      value: metrics.totalCompleted,
      subtitle: (
        <span className="text-[11px] text-muted-foreground">
          Avg. {dailyAverage} / day • {metrics.totalScheduled} scheduled
        </span>
      ),
      icon: Flame,
      color: "text-brand-indigo dark:text-indigo-400",
      bg: "bg-brand-indigo/10 border-brand-indigo/20",
    },
    {
      title: "Routine Adherence",
      value: `${metrics.recurringAdherenceRate}%`,
      subtitle: (
        <span className="text-[11px] text-muted-foreground">
          {metrics.totalSkipped > 0
            ? `${metrics.totalSkipped} occurrences skipped`
            : "Zero occurrences skipped"}
        </span>
      ),
      icon: Repeat,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Subtasks Cleared",
      value: metrics.totalSubtasksCompleted,
      subtitle: (
        <span className="text-[11px] text-muted-foreground">
          {metrics.streakDays > 0
            ? `${metrics.streakDays}-day streak active`
            : "Checklist items finished"}
        </span>
      ),
      icon: ListChecks,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={cn(
              "p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between shadow-sm",
              card.bg,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                {card.title}
              </span>
              <div
                className={cn(
                  "p-2 rounded-xl bg-background/80 shadow-xs",
                  card.color,
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div
                className={cn(
                  "text-3xl font-extrabold tracking-tight",
                  card.color,
                )}
              >
                {card.value}
              </div>
              <div className="mt-2">{card.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
