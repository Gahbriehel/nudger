"use client";

import { useState } from "react";
import { CompletedReportItem } from "@/types/database.types";
import { format } from "@/lib/date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Search,
  Sparkles,
  ListOrdered,
  Calendar,
} from "lucide-react";

interface AccomplishmentListProps {
  items: CompletedReportItem[];
}

export function AccomplishmentList({ items }: AccomplishmentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((t) =>
        t.toLowerCase().includes(searchTerm.toLowerCase()),
      ) ||
      (item.cueContent &&
        item.cueContent.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      selectedType === "all" || item.taskType === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 rounded-2xl border border-border bg-card/85 backdrop-blur-md shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Accomplishments Log
            </h3>
            <p className="text-xs text-muted-foreground">
              {items.length} tasks completed during this timeframe
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search completions..."
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 rounded-xl border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
          >
            <option value="all">All Types</option>
            <option value="flexible">Flexible</option>
            <option value="scheduled">Scheduled</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          {items.length === 0
            ? "No completed tasks recorded in this period."
            : "No items match your search filter."}
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/20 px-2 rounded-xl transition-colors"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {item.title}
                  </span>

                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 capitalize font-medium"
                  >
                    {item.taskType}
                  </Badge>

                  {item.subtasksTotal > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-mono">
                      <ListOrdered className="w-3 h-3" />
                      {item.subtasksCompleted}/{item.subtasksTotal}
                    </span>
                  )}
                </div>

                {/* Memory cue note snippet */}
                {item.hasMemoryCue && item.cueContent && (
                  <div className="inline-flex items-center gap-1 text-[11px] text-brand-indigo/90 dark:text-indigo-400 bg-brand-indigo/5 px-2 py-0.5 rounded-md max-w-full truncate">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span className="truncate">Cue: {item.cueContent}</span>
                  </div>
                )}

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Completion date */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 font-medium sm:text-right">
                <Calendar className="w-3 h-3 text-muted-foreground/70" />
                <span>{format(item.completedAt, "MMM d, h:mm a")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
