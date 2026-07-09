"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { taskService } from "@/services/task.service";
import { tagService } from "@/services/tag.service";
import {
  Task,
  Subtask,
  Tag,
  TaskType,
  RecurrenceType,
} from "@/types/database.types";
import { format } from "@/lib/date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Lightbulb, PartyPopper } from "lucide-react";

function TaskDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // local states for checklist / cues additions
  const [newSubtask, setNewSubtask] = useState("");
  const [newCue, setNewCue] = useState("");

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTaskType, setEditTaskType] = useState<TaskType>("flexible");
  const [editDueDate, setEditDueDate] = useState("");
  const [editReminderAt, setEditReminderAt] = useState("");
  const [editRecurrenceType, setEditRecurrenceType] =
    useState<RecurrenceType>("daily");
  const [editRecurrenceInterval, setEditRecurrenceInterval] =
    useState<string>("1");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // smart completion prompt state
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  // tracks whether we've already fired the prompt for the current all-complete state
  // resets to false whenever a subtask is unchecked
  const promptShownRef = useRef(false);

  const loadTask = async () => {
    try {
      const data = await taskService.getTaskById(id);
      setTask(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load task");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const tags = await tagService.getTags();
        setAvailableTags(tags);
      } catch (err) {
        console.error("Failed to load available tags:", err);
      }
    };
    fetchAvailableTags();
  }, []);

  const startEditing = () => {
    if (!task) return;
    setEditTitle(task.title || "");
    setEditDescription(task.description || "");
    setEditNotes(task.notes || "");
    setEditTaskType(task.task_type || "flexible");
    setEditDueDate(
      task.due_date ? format(task.due_date, "yyyy-MM-dd'T'HH:mm") : "",
    );
    setEditReminderAt(
      task.reminder_at ? format(task.reminder_at, "yyyy-MM-dd'T'HH:mm") : "",
    );
    setEditRecurrenceType(task.recurrence_type || "daily");
    setEditRecurrenceInterval(String(task.recurrence_interval || 1));
    setEditTags(task.tags ? task.tags.map((t) => t.name) : []);
    setNewTagInput("");
    setIsEditing(true);
  };

  const handleAddEditTag = () => {
    const cleanTag = newTagInput.trim().toLowerCase();
    if (!cleanTag) return;
    if (!editTags.includes(cleanTag)) {
      setEditTags([...editTags, cleanTag]);
    }
    setNewTagInput("");
  };

  const handleToggleEditAvailableTag = (tagName: string) => {
    const cleanTag = tagName.toLowerCase();
    if (editTags.includes(cleanTag)) {
      setEditTags(editTags.filter((t) => t !== cleanTag));
    } else {
      setEditTags([...editTags, cleanTag]);
    }
  };

  const handleSaveEdit = async () => {
    if (!task) return;
    if (!editTitle.trim()) {
      toast.error("Task title is required");
      return;
    }

    setIsSavingEdit(true);
    try {
      const type = editTaskType;
      const updates: Partial<Task> = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        notes: editNotes.trim() || null,
        task_type: type,
      };

      if (type === "flexible") {
        updates.due_date = null;
        updates.reminder_at = null;
        updates.recurrence_type = null;
        updates.recurrence_interval = null;
      } else if (type === "scheduled") {
        updates.due_date = editDueDate
          ? new Date(editDueDate).toISOString()
          : null;
        updates.reminder_at = editReminderAt
          ? new Date(editReminderAt).toISOString()
          : null;
        updates.recurrence_type = null;
        updates.recurrence_interval = null;
      } else if (type === "recurring") {
        updates.due_date = editDueDate
          ? new Date(editDueDate).toISOString()
          : null;
        updates.reminder_at = editReminderAt
          ? new Date(editReminderAt).toISOString()
          : null;
        updates.recurrence_type = editRecurrenceType;
        updates.recurrence_interval = parseInt(editRecurrenceInterval) || 1;
      }

      await taskService.updateTask(task.id, updates);
      await taskService.updateTaskTags(task.id, editTags);

      toast.success("Task updated successfully");
      setIsEditing(false);
      loadTask();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    if (task?.subtasks) {
      const allComplete =
        task.subtasks.length > 0 && task.subtasks.every((s) => s.completed);
      if (!allComplete) {
        promptShownRef.current = false;
      }
    }
  }, [task]);

  const handleToggleSubtask = async (sub: Subtask) => {
    if (!task) return;
    const nextVal = !sub.completed;

    // optimistic UI update
    const updatedSubtasks = task.subtasks?.map((s) =>
      s.id === sub.id ? { ...s, completed: nextVal } : s,
    );
    setTask({ ...task, subtasks: updatedSubtasks });

    // check if all subtasks are now complete
    const allComplete =
      !!updatedSubtasks &&
      updatedSubtasks.length > 0 &&
      updatedSubtasks.every((s) => s.completed);

    if (allComplete && !promptShownRef.current && task.status !== "completed") {
      promptShownRef.current = true; // mark as shown so rapid re-checks don't re-fire
      // small delay so the last checkmark animation finishes first
      setTimeout(() => setShowCompletePrompt(true), 350);
    }

    try {
      await taskService.toggleSubtask(sub.id, nextVal);
      if (!allComplete) {
        toast.success(
          nextVal ? "Subtask completed" : "Subtask marked as pending",
        );
      }
    } catch {
      toast.error("Failed to update subtask");
      loadTask();
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      await taskService.addSubtask(id, newSubtask.trim());
      setNewSubtask("");
      loadTask();
      toast.success("Subtask added");
    } catch {
      toast.error("Failed to add subtask");
    }
  };

  const handleDeleteSubtask = async (subId: string) => {
    try {
      await taskService.deleteSubtask(subId);
      loadTask();
      toast.success("Subtask deleted");
    } catch {
      toast.error("Failed to delete subtask");
    }
  };

  const handleAddCue = async () => {
    if (!newCue.trim()) return;
    try {
      await taskService.addMemoryCue(id, newCue.trim());
      setNewCue("");
      loadTask();
      toast.success("Memory cue added");
    } catch {
      toast.error("Failed to add cue");
    }
  };

  const handleDeleteCue = async (cueId: string) => {
    try {
      await taskService.deleteMemoryCue(cueId);
      loadTask();
      toast.success("Memory cue deleted");
    } catch {
      toast.error("Failed to delete memory cue");
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;
    setIsCompletingTask(true);
    try {
      await taskService.completeTask(task);
      toast.success("Task completed!");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Failed to complete task");
      setIsCompletingTask(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="md" label="Loading task details..." />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 space-y-4">
        <div className="text-destructive text-sm">
          {error || "Task not found."}
        </div>
        <Link
          href="/"
          className="bg-primary text-primary-foreground font-semibold text-xs px-4 py-2 rounded-lg"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const pct =
    totalSubtasks > 0
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col py-10 px-4">
      {/* Smart Completion Prompt Modal */}
      {showCompletePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ animation: "fadeInOverlay 0.2s ease" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setShowCompletePrompt(false)}
          />

          {/* Dialog */}
          <div
            className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5"
            style={{
              animation: "slideUpPrompt 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Confetti icon */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <PartyPopper className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-base font-bold text-foreground">All done!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You&apos;ve completed every checklist item.{" "}
                <br className="hidden sm:block" />
                Ready to mark{" "}
                <span className="font-semibold text-foreground">
                  &ldquo;{task.title}&rdquo;
                </span>{" "}
                as complete?
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setShowCompletePrompt(false);
                  handleCompleteTask();
                }}
                disabled={isCompletingTask}
                className="w-full h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {isCompletingTask ? (
                  <>
                    <Spinner size="sm" />
                    Completing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Yes, mark as complete
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowCompletePrompt(false)}
                variant="outline"
                className="w-full h-9 rounded-xl text-sm font-medium"
              >
                Not yet
              </Button>
            </div>
          </div>

          <style>{`
            @keyframes fadeInOverlay {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes slideUpPrompt {
              from { opacity: 0; transform: translateY(24px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Navigation */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Task Details Card */}
        <div className="border border-border bg-card backdrop-blur-md rounded-2xl p-6 shadow-lg space-y-6">
          {/* Header */}
          {isEditing ? (
            // Edit Mode Form
            <div className="space-y-4 text-xs">
              {/* Title input */}
              <div className="grid gap-1">
                <Label
                  htmlFor="edit-title"
                  className="font-semibold text-muted-foreground text-[11px]"
                >
                  Title
                </Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-xs h-9 rounded-xl border-border/80 bg-background"
                  placeholder="Task title"
                />
              </div>

              {/* Description & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <Label
                    htmlFor="edit-desc"
                    className="font-semibold text-muted-foreground text-[11px]"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="edit-desc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="text-xs rounded-xl min-h-[70px] border-border/80 bg-background"
                    placeholder="Task description"
                  />
                </div>
                <div className="grid gap-1">
                  <Label
                    htmlFor="edit-notes"
                    className="font-semibold text-muted-foreground text-[11px]"
                  >
                    Reference Notes
                  </Label>
                  <Textarea
                    id="edit-notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="text-xs rounded-xl min-h-[70px] border-border/80 bg-background"
                    placeholder="Reference notes"
                  />
                </div>
              </div>

              {/* Task Type Select */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-1">
                  <Label
                    htmlFor="edit-type"
                    className="font-semibold text-muted-foreground text-[11px]"
                  >
                    Task Type
                  </Label>
                  <select
                    id="edit-type"
                    value={editTaskType}
                    onChange={(e) =>
                      setEditTaskType(e.target.value as TaskType)
                    }
                    className="bg-background border border-border/80 text-foreground rounded-xl p-2 text-xs h-9 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="flexible">Flexible</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>

                {editTaskType !== "flexible" && (
                  <>
                    <div className="grid gap-1">
                      <Label
                        htmlFor="edit-due"
                        className="font-semibold text-muted-foreground text-[11px]"
                      >
                        Due Date
                      </Label>
                      <Input
                        id="edit-due"
                        type="datetime-local"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="text-xs h-9 rounded-xl border-border/80 bg-background"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label
                        htmlFor="edit-reminder"
                        className="font-semibold text-muted-foreground text-[11px]"
                      >
                        Reminder
                      </Label>
                      <Input
                        id="edit-reminder"
                        type="datetime-local"
                        value={editReminderAt}
                        onChange={(e) => setEditReminderAt(e.target.value)}
                        className="text-xs h-9 rounded-xl border-border/80 bg-background"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Recurrence Details */}
              {editTaskType === "recurring" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-3 rounded-xl border border-border">
                  <div className="grid gap-1">
                    <Label
                      htmlFor="edit-recurrence-type"
                      className="font-semibold text-muted-foreground text-[11px]"
                    >
                      Recurrence Interval
                    </Label>
                    <select
                      id="edit-recurrence-type"
                      value={editRecurrenceType}
                      onChange={(e) =>
                        setEditRecurrenceType(e.target.value as RecurrenceType)
                      }
                      className="bg-background border border-border/80 text-foreground rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label
                      htmlFor="edit-recurrence-interval"
                      className="font-semibold text-muted-foreground text-[11px]"
                    >
                      Repeat Every
                    </Label>
                    <Input
                      id="edit-recurrence-interval"
                      type="number"
                      min="1"
                      value={editRecurrenceInterval}
                      onChange={(e) =>
                        setEditRecurrenceInterval(e.target.value)
                      }
                      className="text-xs h-9 rounded-xl border-border/80 bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // View Mode Header
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] px-2.5 py-0.5 rounded-full font-medium tracking-wide uppercase",
                    task.task_type === "flexible" &&
                      "bg-muted text-muted-foreground border border-border",
                    task.task_type === "scheduled" &&
                      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                    task.task_type === "recurring" &&
                      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                  )}
                >
                  {task.task_type}
                </span>
                {task.due_date && (
                  <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded font-medium">
                    Due: {format(task.due_date, "MMM dd, yyyy HH:mm")}
                  </span>
                )}
                {task.reminder_at && task.task_type !== "flexible" && (
                  <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Reminder: {format(task.reminder_at, "MMM dd, yyyy HH:mm")}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] px-2.5 py-0.5 rounded-full uppercase font-medium border",
                    task.status === "completed"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  )}
                >
                  {task.status}
                </span>
              </div>

              <h1
                className={cn(
                  "text-2xl font-bold tracking-tight text-foreground",
                  task.status === "completed" &&
                    "line-through text-muted-foreground",
                )}
              >
                {task.title}
              </h1>

              {task.description && (
                <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border">
                  {task.description}
                </p>
              )}
            </div>
          )}

          {/* Subtasks checklist */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Subtask Checklist
              </h2>
              {totalSubtasks > 0 && (
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {completedSubtasks}/{totalSubtasks} completed ({pct}%)
                </span>
              )}
            </div>

            {totalSubtasks > 0 && (
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Add subtask item..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                className="text-xs h-9 rounded-xl border-border/80 bg-background"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <Button
                onClick={handleAddSubtask}
                variant="outline"
                className="text-xs h-9 px-4 rounded-xl font-semibold border-border/80"
              >
                Add
              </Button>
            </div>

            {task.subtasks && task.subtasks.length > 0 ? (
              <div className="space-y-2">
                {task.subtasks
                  .sort((a, b) => {
                    // Primary: incomplete first, completed last
                    if (a.completed !== b.completed) {
                      return a.completed ? 1 : -1;
                    }
                    // Secondary: created_at descending
                    return (
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                    );
                  })
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between bg-muted/30 dark:bg-[#131920] border border-border/80 dark:border-[#222A35]/50 px-4 py-3 rounded-2xl text-xs transition-all hover:bg-muted/40 dark:hover:bg-[#171E27]"
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1 text-foreground">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => handleToggleSubtask(sub)}
                          className="sr-only"
                        />
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                            sub.completed
                              ? "bg-foreground border-foreground text-background"
                              : "border-muted-foreground/60 hover:border-foreground",
                          )}
                        >
                          {sub.completed && (
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className={cn(
                            "font-medium select-none text-foreground/90",
                            sub.completed &&
                              "line-through text-muted-foreground",
                          )}
                        >
                          {sub.title}
                        </span>
                      </label>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteSubtask(sub.id)}
                          className="text-destructive/70 hover:text-destructive text-[10px] font-semibold transition-colors px-1.5 py-0.5"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No subtasks added yet.
              </p>
            )}
          </div>

          {/* Memory Cues */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Memory Cues
            </h2>

            {isEditing && (
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Place server logs spreadsheet on secondary monitor, post-it on screen..."
                  value={newCue}
                  onChange={(e) => setNewCue(e.target.value)}
                  className="text-xs h-9 rounded-xl border-border/80 bg-background"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCue();
                    }
                  }}
                />
                <Button
                  onClick={handleAddCue}
                  variant="outline"
                  className="text-xs h-9 px-4 rounded-xl font-semibold border-border/80"
                >
                  Add
                </Button>
              </div>
            )}

            {task.memory_cues && task.memory_cues.length > 0 ? (
              <div className="space-y-2">
                {task.memory_cues.map((cue) => (
                  <div
                    key={cue.id}
                    className="flex items-center justify-between bg-muted/30 dark:bg-[#131920] border border-border/80 dark:border-[#222A35]/50 px-4 py-3 rounded-2xl text-xs transition-all hover:bg-muted/40 dark:hover:bg-[#171E27]"
                  >
                    <div className="flex items-center gap-3 text-foreground">
                      <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400 select-none flex-shrink-0" />
                      <span className="font-medium text-foreground/90">
                        {cue.content}
                      </span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleDeleteCue(cue.id)}
                        className="text-destructive/70 hover:text-destructive text-[10px] font-semibold transition-colors px-1.5 py-0.5"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No memory cues added yet.
              </p>
            )}
          </div>

          {/* Reference Notes View Mode (hides if empty and not editing) */}
          {!isEditing && task.notes && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reference Notes
              </h2>
              <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border whitespace-pre-wrap">
                {task.notes}
              </p>
            </div>
          )}

          {/* Tags list */}
          {isEditing ? (
            <div className="space-y-2 border-t border-border pt-4">
              <Label className="font-semibold text-muted-foreground text-[11px]">
                Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="New tag name..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEditTag();
                    }
                  }}
                  className="text-xs h-9 rounded-xl border-border/80 bg-background"
                />
                <Button
                  type="button"
                  onClick={handleAddEditTag}
                  variant="outline"
                  className="text-xs h-9 rounded-xl font-semibold border-border/80"
                >
                  Add Tag
                </Button>
              </div>

              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {editTags.map((t) => (
                    <span
                      key={t}
                      className="bg-primary/20 text-foreground border border-primary/30 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-primary/30 transition-colors"
                      onClick={() => handleToggleEditAvailableTag(t)}
                    >
                      #{t}
                      <span className="text-[9px] opacity-60">×</span>
                    </span>
                  ))}
                </div>
              )}

              {availableTags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">
                    Select from existing tags:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags
                      .filter((tag) => !editTags.includes(tag.name))
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleEditAvailableTag(tag.name)}
                          className="bg-muted hover:bg-muted/80 border border-border text-[10px] text-foreground px-2 py-0.5 rounded-full transition-all"
                        >
                          #{tag.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            task.tags &&
            task.tags.length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Associated Tags
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs bg-brand-indigo/5 text-brand-indigo dark:text-brand-blue border border-brand-indigo/10 px-2.5 py-1 rounded-full font-medium"
                    >
                      #{t.name}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Actions footer */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              Created: {format(task.created_at, "PP")}
            </span>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="bg-brand-indigo hover:bg-brand-indigo/90 text-white text-xs font-semibold py-1.5 h-8 rounded px-4 transition-all"
                  >
                    {isSavingEdit ? <Spinner size="sm" /> : "Save Changes"}
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    disabled={isSavingEdit}
                    variant="outline"
                    className="text-xs border border-border py-1.5 h-8 rounded px-4 font-semibold transition-all"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={startEditing}
                    variant="outline"
                    className="text-xs border border-border py-1.5 h-8 rounded px-4 font-semibold transition-all hover:bg-muted"
                  >
                    Edit Task
                  </Button>
                  {task.status !== "completed" && (
                    <Button
                      onClick={handleCompleteTask}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-background text-xs font-semibold py-1.5 h-8 rounded px-4 transition-all"
                    >
                      Mark Complete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <Spinner size="md" label="Loading details..." />
        </div>
      }
    >
      <TaskDetailContent />
    </Suspense>
  );
}
