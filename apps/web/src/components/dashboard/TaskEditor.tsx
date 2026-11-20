/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useForm, zodResolver } from "@/lib/react-hook-form";
import { z, infer as zInfer } from "@/lib/zod";
import { taskService, calculateInitialDueDate } from "@/services/task.service";
import { tagService } from "@/services/tag.service";
import { useTaskStore } from "@/store/taskStore";
import { usePromptStore } from "@/store/promptStore";
import { Tag, Task, TaskType, RecurrenceType } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TASK_TYPE_LABEL } from "@/lib/taskFormat";

import { Spinner } from "@/components/ui/spinner";
import { Lightbulb, Pencil, Trash2, Check, X } from "lucide-react";

export const DAYS_OF_WEEK = [
  { label: "M", value: 1, fullName: "Monday" },
  { label: "T", value: 2, fullName: "Tuesday" },
  { label: "W", value: 3, fullName: "Wednesday" },
  { label: "T", value: 4, fullName: "Thursday" },
  { label: "F", value: 5, fullName: "Friday" },
  { label: "S", value: 6, fullName: "Saturday" },
  { label: "S", value: 0, fullName: "Sunday" },
];

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  task_type: z.string(),
  due_date: z.string().optional(),
  reminder_at: z.string().optional(),
  recurrence_type: z.string().optional(),
  recurrence_interval: z.string().optional(),
  notes: z.string().optional(),
});

type TaskFormInput = zInfer<typeof taskSchema>;

type RepeatMode = "none" | "interval" | "specific_days";

function inferTaskType(repeat: RepeatMode, hasDate: boolean): TaskType {
  if (repeat !== "none") return "recurring";
  return hasDate ? "scheduled" : "flexible";
}

const TYPE_HINT: Record<TaskType, string> = {
  flexible: "No deadline — Nudger checks in now and then.",
  scheduled: "Has a due date and/or reminder.",
  recurring: "Repeats on a schedule.",
};

/** Format an ISO date for a `datetime-local` input (local time). */
export function toInputDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TaskEditorProps {
  /** Omit to create a new task; pass a task to edit it. */
  task?: Task;
  /** Starting values when creating (e.g. carried over from quick add). */
  draft?: { title?: string; due_date?: string };
  /** Receives the saved task. Editing a single recurring occurrence creates a
   * new task, so callers should navigate to the returned id. */
  onSuccess: (task: Task) => void;
  onCancel: () => void;
  /** Lets the container guard against discarding unsaved input. */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * The one task form, used for both creating and editing. Checklist items and
 * memory cues are only collected here on create; for existing tasks they are
 * edited live on the task page.
 */
export function TaskEditor({
  task,
  draft,
  onSuccess,
  onCancel,
  onDirtyChange,
}: TaskEditorProps) {
  const isEdit = !!task;
  const addTaskState = useTaskStore((s) => s.addTaskState);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const [error, setError] = useState<string | null>(null);
  // For recurring edits: ask whether to change one occurrence or the series
  const [pendingScopeData, setPendingScopeData] =
    useState<TaskFormInput | null>(null);
  const [isSavingScope, setIsSavingScope] = useState(false);

  // How (if at all) the task repeats. Recurring-ness is driven by this.
  const [repeat, setRepeat] = useState<RepeatMode>(
    task?.task_type !== "recurring"
      ? "none"
      : task.recurrence_days?.length
        ? "specific_days"
        : "interval",
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    task?.recurrence_days ?? [],
  );

  // Subtasks & Memory Cues local state
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(
    null,
  );
  const [editingSubtaskText, setEditingSubtaskText] = useState("");
  const [memoryCues, setMemoryCues] = useState<string[]>([]);
  const [newCue, setNewCue] = useState("");

  // Tags selection
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    task?.tags?.map((t) => t.name) ?? [],
  );
  const [newTagInput, setNewTagInput] = useState("");

  // Min date-time constraint for datetime-local picker
  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    const pad = (num: number) => String(num).padStart(2, "0");
    const updateMin = () => {
      const now = new Date();
      setMinDateTime(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      );
    };
    updateMin();
    const interval = setInterval(updateMin, 60000);
    return () => clearInterval(interval);
  }, []);

  const {
    register,
    handleSubmit,
    values,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormInput>({
    defaultValues: {
      title: task?.title ?? draft?.title ?? "",
      description: task?.description ?? "",
      task_type: task?.task_type ?? "flexible",
      due_date: task ? toInputDateTime(task.due_date) : (draft?.due_date ?? ""),
      reminder_at: toInputDateTime(task?.reminder_at),
      recurrence_type: task?.recurrence_type ?? "daily",
      recurrence_interval: String(task?.recurrence_interval ?? 1),
      notes: task?.notes ?? "",
    },
    resolver: zodResolver(taskSchema),
  });

  // Task type is inferred from what the user filled in (repeat → recurring,
  // a date → scheduled, neither → flexible) unless they pick one manually.
  const inferredType = inferTaskType(
    repeat,
    !!(values.due_date || values.reminder_at),
  );
  const [typeOverride, setTypeOverride] = useState<TaskType | null>(() => {
    if (!task) return null;
    const fromTask = inferTaskType(
      task.task_type !== "recurring"
        ? "none"
        : task.recurrence_days?.length
          ? "specific_days"
          : "interval",
      !!(task.due_date || task.reminder_at),
    );
    return fromTask === task.task_type ? null : task.task_type;
  });
  const effectiveType: TaskType = typeOverride ?? inferredType;
  const showWhen = effectiveType !== "flexible";
  const showRepeat = typeOverride === null || typeOverride === "recurring";
  // A manual "Recurring" with nothing chosen yet repeats on an interval
  const effectiveRepeat: RepeatMode =
    effectiveType === "recurring"
      ? repeat === "none"
        ? "interval"
        : repeat
      : "none";

  const chooseType = (type: TaskType | null) => {
    setTypeOverride(type);
    if (type === "recurring" && repeat === "none") setRepeat("interval");
  };

  useEffect(() => {
    // Load existing tags
    tagService
      .getTags()
      .then(setAvailableTags)
      .catch((err) => console.error("Error fetching tags:", err));
  }, []);

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask("");
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
    if (editingSubtaskIndex === index) {
      setEditingSubtaskIndex(null);
      setEditingSubtaskText("");
    }
  };

  const handleStartEditSubtask = (index: number) => {
    setEditingSubtaskIndex(index);
    setEditingSubtaskText(subtasks[index]);
  };

  const handleSaveEditSubtask = (index: number) => {
    const trimmed = editingSubtaskText.trim();
    if (trimmed) {
      const updated = [...subtasks];
      updated[index] = trimmed;
      setSubtasks(updated);
    }
    setEditingSubtaskIndex(null);
    setEditingSubtaskText("");
  };

  const handleCancelEditSubtask = () => {
    setEditingSubtaskIndex(null);
    setEditingSubtaskText("");
  };

  const handleAddCue = () => {
    if (newCue.trim()) {
      setMemoryCues([...memoryCues, newCue.trim()]);
      setNewCue("");
    }
  };

  const handleRemoveCue = (index: number) => {
    setMemoryCues(memoryCues.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    const cleanTag = newTagInput.trim().toLowerCase();
    if (cleanTag && !selectedTags.includes(cleanTag)) {
      setSelectedTags([...selectedTags, cleanTag]);
      setNewTagInput("");
    }
  };

  const handleToggleAvailableTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const initialDue = toInputDateTime(task?.due_date);
  const initialReminder = toInputDateTime(task?.reminder_at);

  // Report unsaved input so the container can confirm before discarding
  const isDirty =
    (isEdit
      ? values.title !== (task?.title ?? "") ||
        values.description !== (task?.description ?? "") ||
        values.notes !== (task?.notes ?? "") ||
        effectiveType !== task?.task_type ||
        values.due_date !== initialDue ||
        values.reminder_at !== initialReminder
      : !!(values.title || values.description || values.notes) ||
        subtasks.length > 0 ||
        memoryCues.length > 0) ||
    !!(newSubtask.trim() || newCue.trim() || newTagInput.trim());
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  /** Validation + recurring scope question, then save. */
  const onSubmit = async (data: TaskFormInput) => {
    setError(null);
    const timed = effectiveType !== "flexible";

    // Only dates the user actually set/changed must be in the future, so an
    // overdue task can still be renamed without being forced to reschedule.
    const nowBuffer = new Date(Date.now() - 60000);
    const dueChanged = !isEdit || data.due_date !== initialDue;
    const reminderChanged = !isEdit || data.reminder_at !== initialReminder;
    if (
      timed &&
      dueChanged &&
      data.due_date &&
      new Date(data.due_date) < nowBuffer
    ) {
      toast.error("Due date cannot be in the past.");
      return;
    }
    if (
      timed &&
      reminderChanged &&
      data.reminder_at &&
      new Date(data.reminder_at) < nowBuffer
    ) {
      toast.error("Reminder cannot be in the past.");
      return;
    }
    if (
      timed &&
      data.due_date &&
      data.reminder_at &&
      new Date(data.reminder_at) > new Date(data.due_date)
    ) {
      toast.error("Reminder cannot be after the due date.");
      return;
    }
    if (effectiveRepeat === "specific_days" && selectedDays.length === 0) {
      toast.error("Please select at least one day of the week.");
      return;
    }

    if (isEdit && task.task_type === "recurring") {
      setPendingScopeData(data);
      return;
    }
    await save(data, "series");
  };

  const saveWithScope = async (scope: "instance" | "series") => {
    if (!pendingScopeData || isSavingScope) return;
    setIsSavingScope(true);
    try {
      await save(pendingScopeData, scope);
    } finally {
      setIsSavingScope(false);
    }
  };

  const save = async (data: TaskFormInput, scope: "instance" | "series") => {
    setError(null);

    // Fold in any half-typed checklist item / cue / tag instead of blocking
    // the save and asking the user to press "Add" first.
    const pendingSubtask = newSubtask.trim();
    const pendingCue = newCue.trim();
    const pendingTag = newTagInput.trim().toLowerCase();
    const finalSubtasks = pendingSubtask
      ? [...subtasks, pendingSubtask]
      : subtasks;
    const finalCues = pendingCue ? [...memoryCues, pendingCue] : memoryCues;
    const finalTags =
      pendingTag && !selectedTags.includes(pendingTag)
        ? [...selectedTags, pendingTag]
        : selectedTags;

    const timed = effectiveType !== "flexible";
    const recurring = effectiveType === "recurring";
    const specificDays = effectiveRepeat === "specific_days";
    const interval = parseInt(data.recurrence_interval || "1", 10) || 1;

    let dueDate =
      timed && data.due_date ? new Date(data.due_date).toISOString() : null;
    if (isEdit && specificDays && !dueDate) {
      dueDate = calculateInitialDueDate(new Date(), selectedDays);
    }

    const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      task_type: effectiveType,
      due_date: dueDate,
      reminder_at:
        timed && data.reminder_at
          ? new Date(data.reminder_at).toISOString()
          : null,
      recurrence_type: recurring
        ? specificDays
          ? ("weekly" as RecurrenceType)
          : (data.recurrence_type as RecurrenceType)
        : null,
      recurrence_interval: recurring ? (specificDays ? 1 : interval) : null,
      recurrence_days: specificDays ? selectedDays : null,
      notes: data.notes?.trim() || null,
    };

    try {
      if (!isEdit) {
        const newTask = await taskService.createTask(
          payload,
          finalSubtasks,
          finalCues,
          finalTags,
        );
        addTaskState(newTask);
        onSuccess(newTask);

        // Best moment to ask for notifications: the user just told us when
        // something matters. (No-op if already enabled or recently declined.)
        if (newTask.due_date || newTask.reminder_at) {
          usePromptStore
            .getState()
            .requestContextualNotificationAsk(newTask.title);
        }
        return;
      }

      let saved: Task;
      if (scope === "instance") {
        saved = await taskService.editTaskInstance(task.id, payload, finalTags);
      } else {
        await taskService.updateTask(task.id, payload);
        await taskService.updateTaskTags(task.id, finalTags);
        saved = { ...task, ...payload };
      }
      setPendingScopeData(null);
      await fetchTasks();
      onSuccess(saved);
    } catch (err: any) {
      const msg =
        err?.message ||
        (isEdit ? "Failed to save changes" : "Failed to create task");
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 text-foreground pb-4 px-1"
      >
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md p-3">
            {error}
          </div>
        )}

        {/* Task Title */}
        <div className="grid gap-2">
          <Label
            htmlFor="title"
            className="text-sm font-semibold flex items-center gap-1.5"
          >
            Title
            <span className="text-destructive text-xs" aria-label="required">
              *
            </span>
          </Label>
          <Input
            id="title"
            placeholder="What do you need to remember?"
            {...register("title")}
            className={cn(errors.title && "border-destructive/50")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="grid gap-2">
          <Label
            htmlFor="description"
            className="text-sm font-semibold flex items-center gap-1.5"
          >
            Description
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              optional
            </span>
          </Label>
          <Textarea
            id="description"
            placeholder="Add details about this task..."
            {...register("description")}
            className="min-h-[80px]"
          />
        </div>

        {/* When */}
        {showWhen ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="due_date" className="text-sm font-semibold">
                {effectiveType === "recurring" ? "First due" : "Due"}
              </Label>
              <Input
                id="due_date"
                type="datetime-local"
                min={isEdit ? undefined : minDateTime}
                {...register("due_date")}
                className="h-11 text-base md:text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder_at" className="text-sm font-semibold">
                Remind me
              </Label>
              <Input
                id="reminder_at"
                type="datetime-local"
                min={isEdit ? undefined : minDateTime}
                {...register("reminder_at")}
                className="h-11 text-base md:text-sm"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl p-3">
            Flexible tasks have no due date. Choose{" "}
            <button
              type="button"
              onClick={() => chooseType(null)}
              className="font-semibold text-foreground underline underline-offset-2"
            >
              Auto
            </button>{" "}
            to add one.
          </p>
        )}

        {/* Repeat */}
        {showRepeat && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Repeat</Label>
            <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
              {(
                [
                  ["none", "Doesn't repeat"],
                  ["interval", "Every…"],
                  ["specific_days", "On days"],
                ] as const
              )
                // A manual "Recurring" must repeat somehow
                .filter(
                  ([mode]) =>
                    !(typeOverride === "recurring" && mode === "none"),
                )
                .map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRepeat(mode)}
                    aria-pressed={effectiveRepeat === mode}
                    className={cn(
                      "flex-1 h-9 px-2 rounded-lg text-xs font-semibold transition-colors",
                      effectiveRepeat === mode
                        ? "bg-card text-foreground shadow-sm border border-border/50"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
            </div>

            {effectiveRepeat === "interval" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Every</span>
                <Input
                  id="recurrence_interval"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  aria-label="Repeat every"
                  {...register("recurrence_interval")}
                  className="h-11 w-20 text-base md:text-sm"
                />
                <select
                  id="recurrence_type"
                  aria-label="Repeat unit"
                  {...register("recurrence_type")}
                  className="h-11 flex-1 bg-background border border-input text-foreground rounded-md px-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="daily">day(s)</option>
                  <option value="weekly">week(s)</option>
                  <option value="monthly">month(s)</option>
                  <option value="yearly">year(s)</option>
                </select>
              </div>
            )}

            {effectiveRepeat === "specific_days" && (
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() =>
                        setSelectedDays(
                          isSelected
                            ? selectedDays.filter((d) => d !== day.value)
                            : [...selectedDays, day.value],
                        )
                      }
                      aria-pressed={isSelected}
                      aria-label={day.fullName}
                      title={day.fullName}
                      className={cn(
                        "w-11 h-11 rounded-full text-sm font-bold border transition-all active:scale-90 flex items-center justify-center select-none",
                        isSelected
                          ? "bg-brand-indigo text-white border-brand-indigo dark:bg-brand-purple dark:border-brand-purple"
                          : "bg-background border-border text-foreground hover:bg-muted",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Type: inferred, with a manual override */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Type</Label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => chooseType(null)}
              aria-pressed={typeOverride === null}
              className={cn(
                "h-9 px-3 rounded-full text-xs font-semibold border transition-colors",
                typeOverride === null
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground",
              )}
            >
              Auto · {TASK_TYPE_LABEL[inferredType]}
            </button>
            {(["flexible", "scheduled", "recurring"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => chooseType(type)}
                aria-pressed={typeOverride === type}
                className={cn(
                  "h-9 px-3 rounded-full text-xs font-semibold border transition-colors",
                  typeOverride === type
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {TASK_TYPE_LABEL[type]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {TYPE_HINT[effectiveType]}
          </p>
        </div>

        {/* Subtasks checklist (create only — edited live on the task page) */}
        {!isEdit && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                Subtasks / Checklist
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  optional
                </span>
                <InfoTooltip>
                  Break this task into smaller steps you can check off.
                </InfoTooltip>
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add subtask details..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="rounded-xl h-10 text-base md:text-sm"
              />
              <Button
                type="button"
                onClick={handleAddSubtask}
                variant="outline"
                className="px-4 h-10 rounded-xl font-semibold"
              >
                Add
              </Button>
            </div>
            {subtasks.length > 0 && (
              <ul className="space-y-2 mt-2">
                {subtasks.map((sub, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center bg-muted/30 dark:bg-[#131920] border border-border/80 dark:border-[#222A35]/50 px-4 py-3 rounded-2xl text-sm text-foreground shadow-sm transition-all hover:bg-muted/40 dark:hover:bg-[#171E27]"
                  >
                    {editingSubtaskIndex === idx ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingSubtaskText}
                          onChange={(e) =>
                            setEditingSubtaskText(e.target.value)
                          }
                          className="text-base md:text-xs h-8 rounded-xl border-border/80 bg-background flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEditSubtask(idx);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              handleCancelEditSubtask();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditSubtask(idx)}
                          className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-600 dark:text-green-400 transition-colors"
                          title="Save changes (Enter)"
                          aria-label="Save checklist item"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditSubtask}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Cancel (Esc)"
                          aria-label="Cancel editing"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 min-w-0 mr-2">
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/60 flex-shrink-0" />
                          <span className="font-semibold text-foreground/90 break-words">
                            {sub}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditSubtask(idx)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/80 transition-colors"
                            title="Edit checklist item"
                            aria-label={`Edit ${sub}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(idx)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors"
                            title="Remove checklist item"
                            aria-label={`Remove ${sub}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Memory Cues (create only) */}
        {!isEdit && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                Memory Cues
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  optional
                </span>
                <InfoTooltip>
                  Environmental triggers to help you remember — e.g.
                  &ldquo;Place server logs spreadsheet on secondary
                  monitor&rdquo;.
                </InfoTooltip>
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                value={newCue}
                onChange={(e) => setNewCue(e.target.value)}
                placeholder="e.g. Place server logs spreadsheet on secondary monitor, post-it on screen..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCue();
                  }
                }}
                className="rounded-xl h-10 text-base md:text-sm"
              />
              <Button
                type="button"
                onClick={handleAddCue}
                variant="outline"
                className="px-4 h-10 rounded-xl font-semibold"
              >
                Add
              </Button>
            </div>
            {memoryCues.length > 0 && (
              <ul className="space-y-2 mt-2">
                {memoryCues.map((cue, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center bg-muted/30 dark:bg-[#131920] border border-border/80 dark:border-[#222A35]/50 px-4 py-3 rounded-2xl text-sm text-foreground shadow-sm transition-all hover:bg-muted/40 dark:hover:bg-[#171E27]"
                  >
                    <div className="flex items-center gap-3">
                      <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400 select-none flex-shrink-0" />
                      <span className="font-semibold text-foreground/90">
                        {cue}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCue(idx)}
                      className="text-destructive/80 hover:text-destructive text-xs font-semibold transition-colors px-1.5 py-0.5"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Tags Selector */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              Tags
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                optional
              </span>
              <InfoTooltip>
                Labels to group and filter tasks — e.g.
                &ldquo;engineering&rdquo;, &ldquo;finance&rdquo;,
                &ldquo;operations&rdquo;.
              </InfoTooltip>
            </Label>
          </div>
          <div className="flex gap-2">
            <Input
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="Add new tag name..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="rounded-xl h-10 text-base md:text-sm"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              className="px-4 h-10 rounded-xl font-semibold"
            >
              Add Tag
            </Button>
          </div>

          {/* Selected Tags list */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map((t) => (
                <span
                  key={t}
                  className="bg-primary/20 text-foreground border border-primary/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-primary/30 transition-colors"
                  onClick={() => handleToggleAvailableTag(t)}
                >
                  #{t}
                  <span className="text-[10px] opacity-60">×</span>
                </span>
              ))}
            </div>
          )}

          {/* Available Tags list */}
          {availableTags.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">
                Select from existing tags:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableTags
                  .filter((tag) => !selectedTags.includes(tag.name))
                  .map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleAvailableTag(tag.name)}
                      className="bg-muted hover:bg-muted/80 border border-border text-xs text-foreground px-2.5 py-1 rounded-full transition-all"
                    >
                      #{tag.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="grid gap-2">
          <Label
            htmlFor="notes"
            className="text-sm font-semibold flex items-center gap-1.5"
          >
            Notes
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              optional
            </span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Any other mental hooks or reference notes..."
            {...register("notes")}
            className="min-h-[80px]"
          />
        </div>

        {/* Form Controls */}
        {pendingScopeData ? (
          <div className="space-y-3 pt-4 border-t border-border">
            <p className="text-sm text-foreground font-semibold">
              Apply changes to…
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => saveWithScope("instance")}
                disabled={isSavingScope}
                variant="outline"
                className="h-11 rounded-xl font-semibold"
              >
                This occurrence only
              </Button>
              <Button
                type="button"
                onClick={() => saveWithScope("series")}
                disabled={isSavingScope}
                className="h-11 rounded-xl font-semibold"
              >
                All future occurrences
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setPendingScopeData(null)}
              disabled={isSavingScope}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="h-11 min-w-[100px] rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center min-w-[120px] rounded-xl h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner
                  size="sm"
                  className="border-t-primary-foreground border-primary-foreground/30"
                />
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Save Task"
              )}
            </Button>
          </div>
        )}
      </form>
    </>
  );
}
