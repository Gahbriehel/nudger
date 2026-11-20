"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  Repeat,
  Search,
  SkipForward,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import { useTaskStore, type TaskFilters } from "@/store/taskStore";
import { useUiStore } from "@/store/uiStore";
import { useTaskActions } from "@/hooks/useTaskActions";
import type { Task } from "@/types/database.types";
import { format } from "@/lib/date-fns";
import { cn } from "@/lib/utils";
import {
  TASK_TYPE_ACCENT,
  TASK_TYPE_BADGE,
  TASK_TYPE_LABEL,
  formatWhen,
  isOverdue,
  recurrenceLabel,
} from "@/lib/taskFormat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterSidebar } from "./FilterSidebar";

const DEFAULT_FILTERS: Omit<TaskFilters, "search"> = {
  type: "all",
  status: "all",
  sort: "recently_updated",
};

function filterAndSort(tasks: Task[], filters: TaskFilters): Task[] {
  const term = filters.search.trim().toLowerCase();
  return tasks
    .filter((task) => {
      const matchesSearch =
        !term ||
        task.title.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        task.notes?.toLowerCase().includes(term) ||
        task.tags?.some((tag) => tag.name.toLowerCase().includes(term));
      const matchesType =
        filters.type === "all" || task.task_type === filters.type;
      const matchesStatus =
        filters.status === "all" || task.status === filters.status;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      // Pending first, completed last
      const ac = a.status === "completed";
      const bc = b.status === "completed";
      if (ac !== bc) return ac ? 1 : -1;

      switch (filters.sort) {
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "due_soon":
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return (
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        case "most_subtasks":
          return (b.subtasks?.length || 0) - (a.subtasks?.length || 0);
        default:
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
      }
    });
}

export function TaskList() {
  const { tasks, loading, hasLoaded, filters, setFilters } = useTaskStore();
  const openCreateTask = useUiStore((s) => s.openCreateTask);
  const actions = useTaskActions();
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  // Client-only "now" (avoids hydration mismatch on time-based styling)
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(
    () => filterAndSort(tasks, filters),
    [tasks, filters],
  );
  const totalPending = tasks.filter((t) => t.status !== "completed").length;
  const activeFilterCount = [
    filters.type !== "all",
    filters.status !== "all",
    filters.sort !== "recently_updated",
  ].filter(Boolean).length;
  const isFiltered = activeFilterCount > 0 || !!filters.search.trim();

  return (
    <div className="space-y-5">
      {/* Date strip */}
      <div className="border border-border bg-card rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-end gap-2 leading-none">
            <span className="text-4xl font-black text-foreground">
              {now ? format(now, "d") : "--"}
            </span>
            <span className="text-2xl font-bold text-foreground mb-0.5">
              {now ? format(now, "MMMM") : ""}
            </span>
          </div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground mt-1 uppercase">
            {now ? format(now, "EEEE") : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="w-4 h-4" />
          <span className="font-semibold">
            {totalPending} to-do{totalPending !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <FilterSidebar
        open={filterSidebarOpen}
        onClose={() => setFilterSidebarOpen(false)}
      />

      {/* Search + filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="search-input"
            type="search"
            placeholder="Search tasks, tags, notes…"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="text-base md:text-sm h-11 pl-9 pr-3 rounded-xl"
          />
        </div>
        <button
          id="open-filters-btn"
          onClick={() => setFilterSidebarOpen(true)}
          className={cn(
            "flex items-center gap-2 h-11 px-4 rounded-xl border text-sm font-semibold transition-colors whitespace-nowrap",
            activeFilterCount > 0
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground border-border hover:bg-muted",
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-background/20 text-xs font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      {loading || !hasLoaded ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="md" label="Loading tasks..." />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Nothing to remember yet"
          body="Add the first thing you don't want to keep in your head — a deadline, a habit, or just something for later."
          action={
            <Button
              onClick={openCreateTask}
              className="h-11 px-5 rounded-xl font-semibold gap-2"
            >
              <Plus className="w-4 h-4" /> Add your first task
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No tasks match"
          body="Try a different search or clear your filters."
          action={
            isFiltered && (
              <Button
                variant="outline"
                onClick={() => setFilters({ search: "", ...DEFAULT_FILTERS })}
                className="h-11 px-5 rounded-xl font-semibold"
              >
                Clear search & filters
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((task) => (
            <TaskCard key={task.id} task={task} now={now} actions={actions} />
          ))}
        </ul>
      )}

      {actions.dialogs}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-border rounded-2xl bg-muted/20 flex flex-col items-center gap-3">
      <p className="font-bold text-base text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        {body}
      </p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

function TaskCard({
  task,
  now,
  actions,
}: {
  task: Task;
  now: Date | null;
  actions: ReturnType<typeof useTaskActions>;
}) {
  const done = task.status === "completed";
  const overdue = now ? isOverdue(task, now.getTime()) : false;
  const subs = task.subtasks ?? [];
  const subsDone = subs.filter((s) => s.completed).length;
  const repeat = recurrenceLabel(task);
  const canSnooze = !done && task.task_type !== "flexible";
  const canSkip = !done && task.task_type === "recurring";
  // Inline checklist: tick items without leaving the list
  const [checklistOpen, setChecklistOpen] = useState(false);

  return (
    <li
      id={`task-card-${task.id}`}
      className={cn(
        // `relative` anchors the stretched link that makes the card tappable
        "relative border border-border border-l-4 bg-card rounded-xl shadow-sm transition-colors hover:border-brand-indigo/30 dark:hover:border-brand-blue/30",
        done
          ? "border-l-muted-foreground/30 opacity-60"
          : TASK_TYPE_ACCENT[task.task_type],
      )}
    >
      <div className="flex items-start gap-1 p-2 pr-1">
        {/* Complete toggle — 44px target */}
        <button
          onClick={() => actions.toggleCompletion(task)}
          aria-label={done ? "Mark not done" : "Mark complete"}
          className="relative z-10 h-11 w-11 shrink-0 flex items-center justify-center"
        >
          <span
            className={cn(
              "w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-colors",
              done
                ? "bg-foreground border-foreground text-background"
                : "border-muted-foreground/60 hover:border-foreground/80",
            )}
          >
            {done && <Check className="w-3.5 h-3.5" strokeWidth={3.5} />}
          </span>
        </button>

        <div className="flex-1 min-w-0 py-2.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/tasks/${task.id}`}
              className={cn(
                "font-bold text-base text-foreground leading-snug break-words",
                // Stretched link: the whole card opens the task
                "after:absolute after:inset-0 after:rounded-xl",
                done && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </Link>
            <span
              className={cn(
                "text-[11px] px-2.5 py-0.5 rounded-full font-semibold border shrink-0 mt-0.5",
                TASK_TYPE_BADGE[task.task_type],
              )}
            >
              {TASK_TYPE_LABEL[task.task_type]}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          {(task.due_date || repeat) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {task.due_date && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-medium",
                    overdue
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground",
                  )}
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  {overdue ? "Overdue · " : ""}
                  {now ? formatWhen(task.due_date, now) : ""}
                </span>
              )}
              {repeat && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Repeat className="w-3.5 h-3.5" />
                  {repeat}
                </span>
              )}
            </div>
          )}

          {subs.length > 0 && (
            <div>
              {/* Progress doubles as the checklist toggle. `relative z-10`
                  lifts it above the card's stretched link. */}
              <button
                onClick={() => setChecklistOpen((o) => !o)}
                aria-expanded={checklistOpen}
                aria-controls={`checklist-${task.id}`}
                className="relative z-10 -ml-2 flex items-center gap-2.5 h-9 px-2 rounded-lg hover:bg-muted text-left"
              >
                <span className="w-[120px] h-1.5 bg-muted rounded-full overflow-hidden">
                  <span
                    className="block h-full bg-foreground rounded-full transition-all duration-300"
                    style={{ width: `${(subsDone / subs.length) * 100}%` }}
                  />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {subsDone}/{subs.length} checklist
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    checklistOpen && "rotate-180",
                  )}
                />
              </button>

              {checklistOpen && (
                <ul
                  id={`checklist-${task.id}`}
                  className="relative z-10 mt-1 -ml-2 divide-y divide-border/50"
                >
                  {subs.map((sub) => {
                    const saving = sub.id.startsWith("temp-");
                    return (
                      <li key={sub.id}>
                        <button
                          onClick={() => actions.toggleSubtask(task, sub)}
                          disabled={saving}
                          aria-pressed={sub.completed}
                          className="w-full flex items-center gap-3 min-h-11 px-2 py-1.5 rounded-lg text-left hover:bg-muted/60 disabled:opacity-60"
                        >
                          <span
                            className={cn(
                              "w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors",
                              sub.completed
                                ? "bg-foreground border-foreground text-background"
                                : "border-muted-foreground/60",
                            )}
                          >
                            {sub.completed && (
                              <Check className="w-3 h-3" strokeWidth={3.5} />
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-sm break-words min-w-0",
                              sub.completed &&
                                "line-through text-muted-foreground",
                            )}
                          >
                            {sub.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-[11px] bg-brand-indigo/5 text-brand-indigo dark:text-brand-blue border border-brand-indigo/10 px-2 py-0.5 rounded-full font-medium"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Task options"
              className="relative z-10 h-11 w-11 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => actions.edit(task)}
              className="gap-2 py-2.5"
            >
              <Pencil className="w-4 h-4" /> Edit
            </DropdownMenuItem>
            {canSnooze && (
              <DropdownMenuItem
                onClick={() => actions.snooze(task)}
                className="gap-2 py-2.5"
              >
                <Moon className="w-4 h-4" /> Snooze
              </DropdownMenuItem>
            )}
            {canSkip && (
              <>
                <DropdownMenuItem
                  onClick={() => actions.skip(task, "skipped")}
                  className="gap-2 py-2.5"
                >
                  <SkipForward className="w-4 h-4" /> Skip occurrence
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => actions.skip(task, "missed")}
                  className="gap-2 py-2.5"
                >
                  <XCircle className="w-4 h-4" /> Mark missed
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => actions.requestDelete(task)}
              className="gap-2 py-2.5 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
