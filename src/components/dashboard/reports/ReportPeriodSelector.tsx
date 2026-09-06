"use client";

import { ReportPeriod, ReportTimeframe } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  Share2,
} from "lucide-react";

interface ReportPeriodSelectorProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  timeframe: ReportTimeframe;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onOpenExport: () => void;
  loading?: boolean;
}

export function ReportPeriodSelector({
  period,
  onPeriodChange,
  timeframe,
  onPrev,
  onNext,
  onReset,
  onOpenExport,
  loading = false,
}: ReportPeriodSelectorProps) {
  const isCurrent = timeframe.offset === 0;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-sm">
      {/* Period Tabs */}
      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => onPeriodChange("weekly")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
            period === "weekly"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
          )}
        >
          Weekly Report
        </button>
        <button
          type="button"
          onClick={() => onPeriodChange("monthly")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
            period === "monthly"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
          )}
        >
          Monthly Report
        </button>
      </div>

      {/* Date Range Navigator */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={loading}
            className="h-8 w-8 p-0 rounded-lg"
            title={period === "weekly" ? "Previous week" : "Previous month"}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 px-3 py-1 bg-muted/40 rounded-lg border border-border/40 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-brand-indigo shrink-0" />
            <span className="font-semibold text-foreground whitespace-nowrap">
              {timeframe.label}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-foreground/10 text-muted-foreground font-mono">
              {timeframe.subLabel}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={loading || timeframe.offset >= 0}
            className="h-8 w-8 p-0 rounded-lg"
            title={period === "weekly" ? "Next week" : "Next month"}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {!isCurrent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={loading}
              className="h-8 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
              title="Jump to current period"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Current</span>
            </Button>
          )}
        </div>

        {/* Share / Export button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenExport}
          className="h-8 text-xs gap-1.5 rounded-lg border-border hover:bg-muted font-medium ml-auto sm:ml-2"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export Summary</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>
    </div>
  );
}
