"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  Lightbulb,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  Repeat,
  SkipForward,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { useTaskActions } from "@/hooks/useTaskActions";
import type { Subtask, Task } from "@/types/database.types";
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
import { cn } from "@/lib/utils";
import {
  TASK_TYPE_BADGE,
  TASK_TYPE_LABEL,
  formatWhen,
  isOverdue,
  recurrenceLabel,
  splitChecklist,
} from "@/lib/taskFormat";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id));
  const hasLoaded = useTaskStore((s) => s.hasLoaded);
  const actions = useTaskActions();

  const goBack = () => {
    // Prefer real back navigation (keeps list scroll position); fall back to
    // the task list when the page was opened directly (e.g. a notification).
    if (window.history.length > 1) router.back();
    else router.push("/tasks");
  };

  if (!hasLoaded) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="md" label="Loading task..." />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-sm text-muted-foreground">
          This task doesn&apos;t exist anymore.
        </p>
        <Link
          href="/tasks"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Go to tasks
        </Link>
      </div>
    );
  }

  const done = task.status === "completed";
  const overdue = isOverdue(task);
  const repeat = recurrenceLabel(task);
  // Snoozing an undated task gives it a time (it becomes scheduled)
  const canSnooze = !done;
  const canSkip = !done && task.task_type === "recurring";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between -mx-2">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 h-11 px-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Task options"
              className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
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
              onClick={() => actions.requestDelete(task, goBack)}
              className="gap-2 py-2.5 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-xs px-2.5 py-1 rounded-full font-semibold border",
              TASK_TYPE_BADGE[task.task_type],
            )}
          >
            {TASK_TYPE_LABEL[task.task_type]}
          </span>
          {done && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold border border-green-300 text-green-700 dark:border-green-500/40 dark:text-green-400">
              Done
            </span>
          )}
        </div>
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-foreground break-words",
            done && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </h1>

        {/* Schedule facts */}
        {(task.due_date || task.reminder_at || repeat) && (
          <ul className="space-y-1.5 text-sm">
            {task.due_date && (
              <li
                className={cn(
                  "flex items-center gap-2",
                  overdue
                    ? "text-red-600 dark:text-red-400 font-semibold"
                    : "text-muted-foreground",
                )}
              >
                <CalendarClock className="w-4 h-4 shrink-0" />
                {overdue ? "Overdue · was due " : "Due "}
                {formatWhen(task.due_date)}
              </li>
            )}
            {task.reminder_at && !done && (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Bell className="w-4 h-4 shrink-0" />
                Reminder {formatWhen(task.reminder_at)}
              </li>
            )}
            {repeat && (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Repeat className="w-4 h-4 shrink-0" />
                {repeat}
              </li>
            )}
          </ul>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs bg-brand-indigo/5 text-brand-indigo dark:text-brand-blue border border-brand-indigo/10 px-2.5 py-1 rounded-full font-medium"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Primary actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => actions.toggleCompletion(task)}
          variant={done ? "outline" : "default"}
          className="flex-1 h-12 rounded-xl text-sm font-semibold gap-2"
        >
          <Check className="w-4 h-4" />
          {done ? "Mark as not done" : "Mark complete"}
        </Button>
        {canSnooze && (
          <Button
            onClick={() => actions.snooze(task)}
            variant="outline"
            className="h-12 rounded-xl text-sm font-semibold gap-2 px-4"
          >
            <Moon className="w-4 h-4" />
            Snooze
          </Button>
        )}
      </div>

      {task.description && (
        <Section title="Details">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {task.description}
          </p>
        </Section>
      )}

      <Checklist task={task} actions={actions} />
      <MemoryCues task={task} actions={actions} />

      {task.notes && (
        <Section title="Notes">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {task.notes}
          </p>
        </Section>
      )}

      {actions.dialogs}
    </div>
  );
}

type Actions = ReturnType<typeof useTaskActions>;

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-card rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Text input + add button; submits on Enter. */
function AddRow({
  placeholder,
  label,
  onAdd,
}: {
  placeholder: string;
  label: string;
  onAdd: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    const ok = await onAdd(value);
    if (!ok) setText(value); // restore on failure
  };
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-11 rounded-xl text-base md:text-sm"
      />
      <Button
        type="submit"
        variant="outline"
        aria-label={label}
        className="h-11 w-11 shrink-0 rounded-xl p-0"
      >
        <Plus className="w-5 h-5" />
      </Button>
    </form>
  );
}

function Checklist({ task, actions }: { task: Task; actions: Actions }) {
  const subs = task.subtasks ?? [];
  const { open, done } = splitChecklist(subs);
  const doneCount = done.length;
  const pct = subs.length ? Math.round((doneCount / subs.length) * 100) : 0;
  // Ticked items fold away so what's left is always at the top
  const [showDone, setShowDone] = useState(false);

  return (
    <Section
      title="Checklist"
      aside={
        subs.length > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {doneCount}/{subs.length}
          </span>
        )
      }
    >
      {subs.length > 0 && (
        <>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {open.length > 0 ? (
            <ul className="divide-y divide-border/60 -mx-1">
              {open.map((sub) => (
                <ChecklistItem
                  key={sub.id}
                  task={task}
                  sub={sub}
                  actions={actions}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Every item is ticked off.
            </p>
          )}
          {done.length > 0 && (
            <div className="-mx-1">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                aria-expanded={showDone}
                className="flex items-center gap-1.5 min-h-11 px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    !showDone && "-rotate-90",
                  )}
                />
                Completed · {done.length}
              </button>
              {showDone && (
                <ul className="divide-y divide-border/60">
                  {done.map((sub) => (
                    <ChecklistItem
                      key={sub.id}
                      task={task}
                      sub={sub}
                      actions={actions}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
      <AddRow
        placeholder="Add a checklist item"
        label="Add checklist item"
        onAdd={(text) => actions.addSubtask(task.id, text)}
      />
    </Section>
  );
}

function ChecklistItem({
  task,
  sub,
  actions,
}: {
  task: Task;
  sub: Subtask;
  actions: Actions;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sub.title);
  const saving = sub.id.startsWith("temp-");

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== sub.title) {
      actions.renameSubtask(task.id, sub.id, draft);
    } else {
      setDraft(sub.title);
    }
  };

  return (
    <li className={cn("flex items-center gap-1 py-1", saving && "opacity-60")}>
      <button
        onClick={() => actions.toggleSubtask(task, sub)}
        disabled={saving}
        aria-label={sub.completed ? "Mark not done" : "Mark done"}
        className="h-11 w-11 shrink-0 flex items-center justify-center"
      >
        <span
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
            sub.completed
              ? "bg-foreground border-foreground text-background"
              : "border-muted-foreground/60",
          )}
        >
          {sub.completed && <Check className="w-3.5 h-3.5" strokeWidth={3.5} />}
        </span>
      </button>

      {editing ? (
        <Input
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(sub.title);
              setEditing(false);
            }
          }}
          className="h-10 flex-1 rounded-lg text-base md:text-sm"
        />
      ) : (
        <button
          onClick={() => !saving && setEditing(true)}
          className={cn(
            "flex-1 text-left text-sm py-2 break-words min-w-0",
            sub.completed && "line-through text-muted-foreground",
          )}
        >
          {sub.title}
        </button>
      )}

      {!editing && (
        <button
          onClick={() => actions.deleteSubtask(task.id, sub.id)}
          disabled={saving}
          aria-label={`Delete "${sub.title}"`}
          className="h-11 w-11 shrink-0 flex items-center justify-center text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

function MemoryCues({ task, actions }: { task: Task; actions: Actions }) {
  const cues = task.memory_cues ?? [];
  return (
    <Section title="Memory cues">
      {cues.length === 0 && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Real-world triggers that jog your memory, e.g. &ldquo;Leave the
          charger by the door&rdquo;.
        </p>
      )}
      {cues.length > 0 && (
        <ul className="space-y-2">
          {cues.map((cue) => (
            <li
              key={cue.id}
              className={cn(
                "flex items-start gap-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 pl-3",
                cue.id.startsWith("temp-") && "opacity-60",
              )}
            >
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-3" />
              <span className="flex-1 text-sm py-2.5 break-words min-w-0">
                {cue.content}
              </span>
              <button
                onClick={() => actions.deleteCue(cue.id)}
                aria-label="Delete memory cue"
                className="h-10 w-10 shrink-0 flex items-center justify-center text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddRow
        placeholder="Add a memory cue"
        label="Add memory cue"
        onAdd={(text) => actions.addCue(task.id, text)}
      />
    </Section>
  );
}
