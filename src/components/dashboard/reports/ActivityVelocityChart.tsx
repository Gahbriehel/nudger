"use client";

import { useState } from "react";
import { DailyActivityPoint } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { BarChart3, Award } from "lucide-react";

interface ActivityVelocityChartProps {
  dailyActivity: DailyActivityPoint[];
  mostProductiveDay: string | null;
  period: "weekly" | "monthly";
}

export function ActivityVelocityChart({
  dailyActivity,
  mostProductiveDay,
  period,
}: ActivityVelocityChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DailyActivityPoint | null>(
    null,
  );

  const maxVal = Math.max(
    ...dailyActivity.map((d) => d.completedCount + d.skippedCount),
    4, // Min scale ceiling
  );

  const totalCompletions = dailyActivity.reduce(
    (acc, d) => acc + d.completedCount,
    0,
  );

  return (
    <div className="p-6 rounded-2xl border border-border bg-card/85 backdrop-blur-md shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-indigo/10 text-brand-indigo">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {period === "weekly"
                ? "Daily Completion Velocity"
                : "Monthly Activity Flow"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Task actions across the selected timeline
            </p>
          </div>
        </div>

        {mostProductiveDay && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>Peak Day: {mostProductiveDay}</span>
          </div>
        )}
      </div>

      {totalCompletions === 0 ? (
        <div className="py-12 text-center text-muted-foreground space-y-2">
          <p className="text-sm font-medium">
            No task completions logged in this period
          </p>
          <p className="text-xs max-w-sm mx-auto">
            Tasks completed or occurrences checked off will automatically graph
            here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart Canvas */}
          <div className="h-44 sm:h-52 w-full flex items-end gap-1.5 sm:gap-3 pt-6 px-2">
            {dailyActivity.map((point, index) => {
              const heightPercent = Math.max(
                (point.completedCount / maxVal) * 100,
                point.completedCount > 0 ? 8 : 2,
              );
              const isHovered = hoveredPoint?.date === point.date;
              const hasActivity =
                point.completedCount > 0 || point.skippedCount > 0;

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-12 z-20 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-semibold whitespace-nowrap shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div className="font-bold">{point.fullDateLabel}</div>
                      <div className="text-[10px] opacity-90">
                        {point.completedCount} completed
                        {point.skippedCount > 0
                          ? ` • ${point.skippedCount} skipped`
                          : ""}
                      </div>
                    </div>
                  )}

                  {/* Bar */}
                  <div className="w-full max-w-[42px] flex flex-col items-center justify-end h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-300",
                        hasActivity
                          ? "bg-gradient-to-t from-brand-indigo to-brand-blue group-hover:opacity-90 group-hover:scale-y-[1.03] shadow-xs"
                          : "bg-muted/40 group-hover:bg-muted/70",
                        isHovered &&
                          "ring-2 ring-brand-indigo ring-offset-2 ring-offset-background",
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "mt-2 text-[10px] font-medium transition-colors truncate max-w-full text-center select-none",
                      isHovered
                        ? "text-foreground font-bold"
                        : "text-muted-foreground",
                    )}
                  >
                    {period === "weekly"
                      ? point.dayLabel
                      : index % Math.ceil(dailyActivity.length / 10) === 0
                        ? point.date.split("-")[2]
                        : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-brand-indigo to-brand-blue" />
              <span>Completed Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-muted/50" />
              <span>No Activity</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
