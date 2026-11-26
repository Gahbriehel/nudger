"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isPausedAt } from "@/lib/recurrence";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Coffee,
  Plus,
  Repeat,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { useUiStore } from "@/store/uiStore";
import { useTaskActions } from "@/hooks/useTaskActions";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getNudgeBuckets } from "@/lib/nudges";
import { formatWhen, recurrenceLabel } from "@/lib/taskFormat";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/database.types";

const DAY_MS = 86_400_000;
const endOfToday = (now: Date) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Splits pending tasks into what matters now. */
function useAgenda(tasks: Task[], now: Date | null) {
  return useMemo(() => {
    if (!now) return null;
    const nowMs = now.getTime();
    const todayEnd = endOfToday(now);
    const weekEnd = nowMs + 7 * DAY_MS;
    const pending = tasks.filter(
      (t) => t.status !== "completed" && !isPausedAt(t, nowMs),
    );
    const byDue = (a: Task, b: Task) =>
      new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
    const dueAt = (t: Task) => new Date(t.due_date!).getTime();

    const dated = pending.filter((t) => t.due_date);
    const overdue = dated.filter((t) => dueAt(t) < nowMs).sort(byDue);
    const today = dated
      .filter((t) => dueAt(t) >= nowMs && dueAt(t) < todayEnd)
      .sort(byDue);
    const upNext = dated
      .filter((t) => dueAt(t) >= todayEnd && dueAt(t) < weekEnd)
      .sort(byDue)
      .slice(0, 5);
    // Undated tasks, least recently touched first — good "pick one" candidates
    const anytime = pending
      .filter((t) => !t.due_date)
      .sort(
        (a, b) =>
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      )
      .slice(0, 3);

    const buckets = getNudgeBuckets(tasks, nowMs);
    const needsLook = buckets.forgotten.length + buckets.stale.length;

    return { overdue, today, upNext, anytime, needsLook };
  }, [tasks, now]);
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { tasks, hasLoaded } = useTaskStore();
  const openCreateTask = useUiStore((s) => s.openCreateTask);
  const actions = useTaskActions();

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const agenda = useAgenda(tasks, now);
  const name =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "there";
  const nothingDated =
    agenda &&
    agenda.overdue.length + agenda.today.length + agenda.upNext.length === 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="relative overflow-hidden border border-border bg-card/85 backdrop-blur-md px-5 py-4 sm:p-6 rounded-2xl flex items-center justify-between gap-4 shadow-sm before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {now ? greeting(now) : "Hello"}, {name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {now
              ? now.toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : " "}
          </p>
        </div>
        {/* On phones the floating + button handles this */}
        <Button
          onClick={openCreateTask}
          className="hidden md:inline-flex h-10 px-4 rounded-lg font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> New task
        </Button>
      </div>

      <QuickStats />

      {/* Now */}
      <section className="border border-border bg-card p-4 sm:p-5 rounded-2xl shadow-sm space-y-5">
        {!hasLoaded || !agenda ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" label="Loading your day..." />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="font-bold text-foreground">
              Nothing on your mind yet
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Add the first thing you don&apos;t want to keep in your head.
            </p>
            <Button
              onClick={openCreateTask}
              className="h-11 px-5 rounded-xl font-semibold gap-2"
            >
              <Plus className="w-4 h-4" /> Add a task
            </Button>
          </div>
        ) : (
          <>
            <AgendaGroup
              title="Overdue"
              tone="danger"
              tasks={agenda.overdue}
              now={now!}
              actions={actions}
            />
            <AgendaGroup
              title="Today"
              tasks={agenda.today}
              now={now!}
              actions={actions}
            />
            <AgendaGroup
              title="Next 7 days"
              tasks={agenda.upNext}
              now={now!}
              actions={actions}
            />

            {nothingDated && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 border border-dashed border-border p-4">
                <Coffee className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Nothing due this week.
                  {agenda.anytime.length > 0 &&
                    " Maybe pick something from below?"}
                </p>
              </div>
            )}

            {/* Undated tasks, offered when there's room in the day */}
            {agenda.overdue.length + agenda.today.length < 3 && (
              <AgendaGroup
                title="Anytime"
                tasks={agenda.anytime}
                now={now!}
                actions={actions}
              />
            )}

            <Link
              href="/tasks"
              className="flex items-center justify-center gap-1.5 h-10 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              All tasks <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </section>

      {/* Stale tasks — same rules as the Nudgelist */}
      {agenda && agenda.needsLook > 0 && (
        <Link
          href="/nudgelist"
          className="flex items-center gap-3 border border-amber-500/25 bg-amber-500/5 rounded-2xl p-4 active:bg-amber-500/10"
        >
          <span className="w-10 h-10 shrink-0 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            {agenda.needsLook}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              Needs a look
            </span>
            <span className="block text-xs text-muted-foreground">
              Tasks you haven&apos;t touched in a while
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      )}

      {/* Reports */}
      <Link
        href="/reports"
        className="flex items-center gap-3 border border-border/80 bg-gradient-to-r from-brand-indigo/10 via-card to-brand-blue/10 p-4 sm:p-5 rounded-2xl shadow-sm"
      >
        <span className="p-2.5 rounded-xl bg-brand-indigo/15 text-brand-indigo shrink-0">
          <BarChart3 className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-foreground">
            Weekly & monthly reports
          </span>
          <span className="block text-xs text-muted-foreground">
            Completion velocity, routine adherence, and cue impact.
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </Link>

      {actions.dialogs}
    </div>
  );
}

function AgendaGroup({
  title,
  tasks,
  now,
  actions,
  tone,
}: {
  title: string;
  tasks: Task[];
  now: Date;
  actions: ReturnType<typeof useTaskActions>;
  tone?: "danger";
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="space-y-1">
      <h2
        className={cn(
          "text-xs font-bold uppercase tracking-wider",
          tone === "danger"
            ? "text-red-600 dark:text-red-400"
            : "text-muted-foreground",
        )}
      >
        {title} · {tasks.length}
      </h2>
      <ul className="-mx-2">
        {tasks.map((task) => (
          <AgendaRow key={task.id} task={task} now={now} actions={actions} />
        ))}
      </ul>
    </div>
  );
}

function AgendaRow({
  task,
  now,
  actions,
}: {
  task: Task;
  now: Date;
  actions: ReturnType<typeof useTaskActions>;
}) {
  const done = task.status === "completed";
  const overdue =
    !done &&
    !!task.due_date &&
    new Date(task.due_date).getTime() < now.getTime();
  const repeat = recurrenceLabel(task);
  const subs = task.subtasks ?? [];
  const subsDone = subs.filter((s) => s.completed).length;

  return (
    <li className="flex items-center rounded-xl hover:bg-muted/50">
      <button
        onClick={() => actions.toggleCompletion(task)}
        aria-label={done ? "Mark not done" : `Complete "${task.title}"`}
        className="h-11 w-11 shrink-0 flex items-center justify-center"
      >
        <span
          className={cn(
            "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors",
            done
              ? "bg-foreground border-foreground text-background"
              : overdue
                ? "border-red-500/70"
                : "border-muted-foreground/60",
          )}
        >
          {done && <Check className="w-3.5 h-3.5" strokeWidth={3.5} />}
        </span>
      </button>
      <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0 py-2.5 pr-2">
        <span
          className={cn(
            "block text-sm font-semibold text-foreground truncate",
            done && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {task.due_date && (
            <span className={cn(overdue && "text-red-600 dark:text-red-400")}>
              {formatWhen(task.due_date, now)}
            </span>
          )}
          {repeat && (
            <span className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              {repeat}
            </span>
          )}
          {subs.length > 0 && (
            <span>
              {subsDone}/{subs.length} checklist
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
