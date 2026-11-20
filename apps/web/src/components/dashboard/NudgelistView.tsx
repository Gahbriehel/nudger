"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  Moon,
  MoreVertical,
  Pencil,
  SkipForward,
  Sparkles,
  ThumbsUp,
  Trash2,
  XCircle,
} from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { taskService } from "@/services/task.service";
import { getNudgeBuckets } from "@/lib/nudges";
import { useTaskActions } from "@/hooks/useTaskActions";
import type { Task } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TASK_TYPE_BADGE, TASK_TYPE_LABEL, formatWhen } from "@/lib/taskFormat";

type Kind = "overdue" | "forgotten" | "stale";

const SECTIONS: {
  kind: Kind;
  title: string;
  intro: string;
  badge: string;
}[] = [
  {
    kind: "overdue",
    title: "Overdue",
    intro: "Past their due date. Finish them or snooze to a better time.",
    badge: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  {
    kind: "forgotten",
    title: "Forgotten",
    intro: "Untouched for over a week. Still relevant?",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    kind: "stale",
    title: "Going stale",
    intro: "Untouched for 3–7 days.",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
];

const DAY_MS = 86_400_000;

export function NudgelistView() {
  const { tasks, hasLoaded, updateTaskState, fetchTasks } = useTaskStore();
  const actions = useTaskActions();

  // Client-only clock, re-evaluated each minute
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const buckets = useMemo(
    () => (now === null ? null : getNudgeBuckets(tasks, now)),
    [tasks, now],
  );

  /** "Still relevant": touching the task resets its staleness timer. */
  const keep = async (task: Task) => {
    const updated_at = new Date().toISOString();
    const previous = task.updated_at;
    updateTaskState(task.id, { updated_at });
    try {
      await taskService.updateTask(task.id, { updated_at });
    } catch (err) {
      console.error(err);
      updateTaskState(task.id, { updated_at: previous });
      toast.error("Couldn't update the task");
      fetchTasks();
    }
  };

  if (!hasLoaded || !buckets || now === null) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="md" label="Checking your tasks..." />
      </div>
    );
  }

  const total =
    buckets.overdue.length + buckets.forgotten.length + buckets.stale.length;

  return (
    <div className="space-y-8">
      {total === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-muted/20 flex flex-col items-center p-6 gap-3">
          <Sparkles className="w-8 h-8 text-amber-500" />
          <p className="font-bold text-base text-foreground">
            Your mind is clear
          </p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Nothing overdue, forgotten, or going stale.
          </p>
        </div>
      ) : (
        SECTIONS.map(({ kind, title, intro, badge }) => {
          const list = buckets[kind];
          if (list.length === 0) return null;
          return (
            <section key={kind} className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-foreground">
                    {title}
                  </h2>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-bold",
                      badge,
                    )}
                  >
                    {list.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{intro}</p>
              </div>
              <ul className="space-y-3">
                {list.map((task) => (
                  <NudgeCard
                    key={task.id}
                    task={task}
                    kind={kind}
                    now={now}
                    actions={actions}
                    onKeep={() => keep(task)}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {actions.dialogs}
    </div>
  );
}

function NudgeCard({
  task,
  kind,
  now,
  actions,
  onKeep,
}: {
  task: Task;
  kind: Kind;
  now: number;
  actions: ReturnType<typeof useTaskActions>;
  onKeep: () => void;
}) {
  const idleDays = Math.floor(
    (now - new Date(task.updated_at || task.created_at).getTime()) / DAY_MS,
  );
  const recurring = task.task_type === "recurring";

  return (
    <li className="border border-border bg-card p-4 rounded-xl shadow-sm space-y-3">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/tasks/${task.id}`}
            className="font-bold text-base text-foreground leading-snug break-words hover:underline underline-offset-2"
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
        <p
          className={cn(
            "text-xs",
            kind === "overdue"
              ? "text-red-600 dark:text-red-400 font-medium"
              : "text-muted-foreground",
          )}
        >
          {kind === "overdue" && task.due_date
            ? `Was due ${formatWhen(task.due_date, new Date(now))}`
            : `Untouched for ${idleDays} day${idleDays === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* One clear primary action, one contextual secondary, rest in ⋯ */}
      <div className="flex gap-2">
        <Button
          onClick={() => actions.toggleCompletion(task)}
          className="flex-1 h-11 rounded-xl text-sm font-semibold gap-1.5"
        >
          <Check className="w-4 h-4" /> Complete
        </Button>
        {kind === "overdue" ? (
          <Button
            onClick={() => actions.snooze(task)}
            variant="outline"
            className="flex-1 h-11 rounded-xl text-sm font-semibold gap-1.5"
          >
            <Moon className="w-4 h-4" /> Snooze
          </Button>
        ) : (
          <Button
            onClick={onKeep}
            variant="outline"
            className="flex-1 h-11 rounded-xl text-sm font-semibold gap-1.5"
            title="Keeps it, and resets its 'untouched' timer"
          >
            <ThumbsUp className="w-4 h-4" /> Still relevant
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label="More actions"
              className="h-11 w-11 shrink-0 rounded-xl p-0"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {kind !== "overdue" && (
              <DropdownMenuItem
                onClick={() => actions.snooze(task)}
                className="gap-2 py-2.5"
              >
                <Moon className="w-4 h-4" /> Snooze
              </DropdownMenuItem>
            )}
            {recurring && (
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
            <DropdownMenuItem
              onClick={() => actions.edit(task)}
              className="gap-2 py-2.5"
            >
              <Pencil className="w-4 h-4" /> Edit
            </DropdownMenuItem>
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
