"use client";

import { ReportData } from "@/types/database.types";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
} from "lucide-react";

interface CognitiveCueInsightsProps {
  metrics: ReportData["metrics"];
}

export function CognitiveCueInsights({ metrics }: CognitiveCueInsightsProps) {
  const {
    cueCompletionRate,
    nonCueCompletionRate,
    cueImpactDelta,
    tasksWithCuesCount,
    tasksWithoutCuesCount,
  } = metrics;

  const isPositive = cueImpactDelta >= 0;

  return (
    <div className="p-6 rounded-2xl border border-border bg-card/85 backdrop-blur-md shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Cognitive Cue Impact Score
            </h3>
            <p className="text-xs text-muted-foreground">
              Effectiveness of environmental memory cues on task follow-through
            </p>
          </div>
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border",
            isPositive
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-muted border-border text-muted-foreground",
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {cueImpactDelta}% Cue Boost
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* With Cues Card */}
        <div className="p-4 rounded-xl border border-brand-indigo/30 bg-brand-indigo/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-indigo flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Tasks With Memory Cues
            </span>
            <span className="text-[11px] text-muted-foreground">
              {tasksWithCuesCount} completed
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              {cueCompletionRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              completion rate
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full bg-brand-indigo/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-indigo rounded-full transition-all duration-500"
              style={{ width: `${cueCompletionRate}%` }}
            />
          </div>
        </div>

        {/* Without Cues Card */}
        <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Tasks Without Memory Cues
            </span>
            <span className="text-[11px] text-muted-foreground">
              {tasksWithoutCuesCount} completed
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              {nonCueCompletionRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              completion rate
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full bg-muted-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-muted-foreground rounded-full transition-all duration-500"
              style={{ width: `${nonCueCompletionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Insight message */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-muted-foreground">
        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {cueImpactDelta > 0 ? (
            <>
              Tasks anchored with environmental cues achieved a{" "}
              <strong className="text-foreground">
                +{cueImpactDelta}% higher completion rate
              </strong>
              . Attaching physical cues (e.g. placing items in plain view)
              continues to trigger natural recall and reduce friction.
            </>
          ) : (
            <>
              Try attaching physical memory cues (e.g., &quot;Place notes beside
              coffee mug&quot;) to complex tasks to stimulate prompt action when
              entering that environment.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
