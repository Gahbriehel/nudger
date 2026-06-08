"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/store/taskStore";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function FilterSidebar({ open, onClose }: FilterSidebarProps) {
  const { filters, setFilters } = useTaskStore();

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const activeFilterCount = [
    filters.type !== "all" ? 1 : 0,
    filters.status !== "all" ? 1 : 0,
    filters.sort !== "recently_updated" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleReset = () => {
    setFilters({ type: "all", status: "all", sort: "recently_updated" });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-80 max-w-full bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Filter options"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
            <h2 className="text-sm font-bold text-foreground tracking-tight">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted"
            aria-label="Close filters"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Options */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Task Type */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Task Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "all", label: "All Types" },
                { value: "flexible", label: "Flexible" },
                { value: "scheduled", label: "Scheduled" },
                { value: "recurring", label: "Recurring" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilters({ type: opt.value as any })}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-semibold border transition-all duration-150 text-left",
                    filters.type === opt.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/40 text-foreground border-border hover:border-foreground/30 hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Status */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Status
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: "all", label: "All", description: "Show all tasks" },
                { value: "pending", label: "Pending", description: "Not yet completed" },
                { value: "completed", label: "Completed", description: "Checked off tasks" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilters({ status: opt.value as any })}
                  className={cn(
                    "py-2.5 px-3.5 rounded-lg text-xs border transition-all duration-150 flex items-center justify-between",
                    filters.status === opt.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/40 text-foreground border-border hover:border-foreground/30 hover:bg-muted"
                  )}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      filters.status === opt.value ? "text-background/70" : "text-muted-foreground"
                    )}
                  >
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Sort By */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Sort By
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: "recently_updated", label: "Recently Updated", icon: "🕐" },
                { value: "oldest", label: "Oldest Created", icon: "📅" },
                { value: "due_soon", label: "Due Date (Soonest)", icon: "⏰" },
                { value: "most_subtasks", label: "Most Subtasks", icon: "📋" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilters({ sort: opt.value as any })}
                  className={cn(
                    "py-2.5 px-3.5 rounded-lg text-xs font-semibold border transition-all duration-150 flex items-center gap-2.5",
                    filters.sort === opt.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/40 text-foreground border-border hover:border-foreground/30 hover:bg-muted"
                  )}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Reset */}
        <div className="p-5 border-t border-border">
          <button
            onClick={handleReset}
            disabled={activeFilterCount === 0}
            className={cn(
              "w-full py-2.5 rounded-lg text-xs font-semibold border transition-all duration-150",
              activeFilterCount > 0
                ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                : "bg-muted/30 text-muted-foreground border-border cursor-not-allowed opacity-50"
            )}
          >
            Reset Filters
          </button>
        </div>
      </div>
    </>
  );
}
