"use client";

import { useState, useEffect, Suspense } from "react";
import { taskService } from "@/services/task.service";
import { Task, Subtask } from "@/types/database.types";
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
  
  // inline notes editing state
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const loadTask = async () => {
    try {
      const data = await taskService.getTaskById(id);
      setTask(data);
      setNotes(data.notes || "");
    } catch (err: any) {
      setError(err.message || "Failed to load task");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [id]);

  const handleToggleSubtask = async (sub: Subtask) => {
    if (!task) return;
    const nextVal = !sub.completed;
    
    // optimistic UI update
    setTask({
      ...task,
      subtasks: task.subtasks?.map((s) => (s.id === sub.id ? { ...s, completed: nextVal } : s)),
    });

    try {
      await taskService.toggleSubtask(sub.id, nextVal);
      toast.success(nextVal ? "Subtask completed" : "Subtask marked as pending");
    } catch (err) {
      toast.error("Failed to update subtask");
      // roll back
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
    } catch (err) {
      toast.error("Failed to add subtask");
    }
  };

  const handleDeleteSubtask = async (subId: string) => {
    try {
      await taskService.deleteSubtask(subId);
      loadTask();
      toast.success("Subtask deleted");
    } catch (err) {
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
    } catch (err) {
      toast.error("Failed to add cue");
    }
  };

  const handleDeleteCue = async (cueId: string) => {
    try {
      await taskService.deleteMemoryCue(cueId);
      loadTask();
      toast.success("Memory cue deleted");
    } catch (err) {
      toast.error("Failed to delete memory cue");
    }
  };

  const handleSaveNotes = async () => {
    try {
      await taskService.updateTask(id, { notes: notes.trim() || null });
      setIsEditingNotes(false);
      loadTask();
      toast.success("Notes saved");
    } catch (err) {
      toast.error("Failed to save notes");
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;
    try {
      await taskService.completeTask(task);
      toast.success("Task completed!");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error("Failed to complete task");
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
        <div className="text-destructive text-sm">{error || "Task not found."}</div>
        <Link href="/" className="bg-primary text-primary-foreground font-semibold text-xs px-4 py-2 rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const pct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col py-10 px-4">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Navigation */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Task Details Card */}
        <div className="border border-border bg-card backdrop-blur-md rounded-2xl p-6 shadow-lg space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "text-[10px] px-2.5 py-0.5 rounded-full font-medium tracking-wide uppercase",
                  task.task_type === "flexible" && "bg-muted text-muted-foreground border border-border",
                  task.task_type === "scheduled" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                  task.task_type === "recurring" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                )}
              >
                {task.task_type}
              </span>
              {task.due_date && (
                <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded font-medium">
                  Due: {format(task.due_date, "MMM dd, yyyy HH:mm")}
                </span>
              )}
              <span className={cn(
                "text-[10px] px-2.5 py-0.5 rounded-full uppercase font-medium border",
                task.status === "completed"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              )}>
                {task.status}
              </span>
            </div>

            <h1 className={cn(
              "text-2xl font-bold tracking-tight text-foreground",
              task.status === "completed" && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h1>

            {task.description && (
              <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border">
                {task.description}
              </p>
            )}
          </div>

          {/* Subtasks checklist */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subtask Checklist</h2>
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
                className="text-xs h-9 rounded-xl border-border/80"
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
                className="text-xs h-9 px-4 rounded-xl font-semibold"
              >
                Add
              </Button>
            </div>

            {task.subtasks && task.subtasks.length > 0 ? (
              <div className="space-y-2">
                {task.subtasks
                  .sort((a, b) => a.sort_order - b.sort_order)
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
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                          sub.completed 
                            ? "bg-foreground border-foreground text-background" 
                            : "border-muted-foreground/60 hover:border-foreground"
                        )}>
                          {sub.completed && (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={cn("font-medium select-none text-foreground/90", sub.completed && "line-through text-muted-foreground")}>
                          {sub.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="text-destructive/70 hover:text-destructive text-[10px] font-semibold transition-colors px-1.5 py-0.5"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No subtasks added yet.</p>
            )}
          </div>

          {/* Memory Cues */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Memory Cues</h2>

            <div className="flex gap-2">
              <Input
                placeholder="e.g. Put keys in fridge, note on screen..."
                value={newCue}
                onChange={(e) => setNewCue(e.target.value)}
                className="text-xs h-9 rounded-xl border-border/80"
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
                className="text-xs h-9 px-4 rounded-xl font-semibold"
              >
                Add
              </Button>
            </div>

            {task.memory_cues && task.memory_cues.length > 0 ? (
              <div className="space-y-2">
                {task.memory_cues.map((cue) => (
                  <div
                    key={cue.id}
                    className="flex items-center justify-between bg-muted/30 dark:bg-[#131920] border border-border/80 dark:border-[#222A35]/50 px-4 py-3 rounded-2xl text-xs transition-all hover:bg-muted/40 dark:hover:bg-[#171E27]"
                  >
                    <div className="flex items-center gap-3 text-foreground">
                      <span className="text-amber-500 dark:text-amber-400 select-none flex-shrink-0 text-sm">💡</span>
                      <span className="font-medium text-foreground/90">{cue.content}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCue(cue.id)}
                      className="text-destructive/70 hover:text-destructive text-[10px] font-semibold transition-colors px-1.5 py-0.5"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No memory cues added yet.</p>
            )}
          </div>

          {/* Reference Notes / Inline Editing */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference Notes</h2>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit Notes
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  placeholder="Add reference notes or info to help remember..."
                  className="text-xs"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveNotes}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-1 h-8 rounded px-3"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditingNotes(false);
                      setNotes(task.notes || "");
                    }}
                    variant="outline"
                    className="text-xs py-1 h-8 rounded px-3"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : task.notes ? (
              <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border whitespace-pre-wrap">
                {task.notes}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No reference notes added yet.</p>
            )}
          </div>

          {/* Tags list */}
          {task.tags && task.tags.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Associated Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((t) => (
                  <span
                    key={t.id}
                    className="bg-muted text-xs text-muted-foreground border border-border px-2.5 py-1 rounded-full"
                  >
                    #{t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions footer */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              Created: {format(task.created_at, "PP")}
            </span>
            <div className="flex gap-2">
              {task.status !== "completed" && (
                <Button
                  onClick={handleCompleteTask}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-1.5 h-8 rounded px-4"
                >
                  Mark Complete
                </Button>
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
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="md" label="Loading details..." />
      </div>
    }>
      <TaskDetailContent />
    </Suspense>
  );
}
