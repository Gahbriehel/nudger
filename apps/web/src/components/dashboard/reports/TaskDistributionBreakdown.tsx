"use client";

import {
  ReportTaskTypeSummary,
  ReportTagSummary,
} from "@/types/database.types";
import { Layers, Tag as TagIcon } from "lucide-react";

interface TaskDistributionBreakdownProps {
  taskTypes: ReportTaskTypeSummary[];
  tags: ReportTagSummary[];
}

export function TaskDistributionBreakdown({
  taskTypes,
  tags,
}: TaskDistributionBreakdownProps) {
  const typeColorMap: Record<
    string,
    { bg: string; fill: string; text: string }
  > = {
    flexible: {
      bg: "bg-blue-500/15",
      fill: "bg-blue-500",
      text: "text-blue-600 dark:text-blue-400",
    },
    scheduled: {
      bg: "bg-brand-indigo/15",
      fill: "bg-brand-indigo",
      text: "text-brand-indigo dark:text-indigo-400",
    },
    recurring: {
      bg: "bg-emerald-500/15",
      fill: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Task Type Breakdown */}
      <div className="p-6 rounded-2xl border border-border bg-card/85 backdrop-blur-md shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Completions by Task Type
            </h3>
            <p className="text-xs text-muted-foreground">
              Flexible vs Scheduled vs Recurring
            </p>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
          {taskTypes.map((item) => {
            if (item.percentage === 0) return null;
            const style = typeColorMap[item.type] || typeColorMap.scheduled;
            return (
              <div
                key={item.type}
                style={{ width: `${item.percentage}%` }}
                className={style.fill}
                title={`${item.label}: ${item.completed} (${item.percentage}%)`}
              />
            );
          })}
        </div>

        {/* List of types */}
        <div className="space-y-2.5 pt-1">
          {taskTypes.map((item) => {
            const style = typeColorMap[item.type] || typeColorMap.scheduled;
            return (
              <div
                key={item.type}
                className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/30 border border-border/30"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${style.fill}`} />
                  <span className="font-semibold text-foreground">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">
                    {item.completed} items
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] ${style.bg} ${style.text}`}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Tags Breakdown */}
      <div className="p-6 rounded-2xl border border-border bg-card/85 backdrop-blur-md shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <TagIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Focus Tags</h3>
            <p className="text-xs text-muted-foreground">
              Categories where your efforts were focused
            </p>
          </div>
        </div>

        {tags.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tags attached to completed tasks in this period.
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {tags.map((tag) => (
              <div key={tag.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />#
                    {tag.name}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {tag.count} tasks ({tag.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${tag.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
