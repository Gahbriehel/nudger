"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTaskStore } from "@/store/taskStore";
import { useUiStore } from "@/store/uiStore";
import { taskService } from "@/services/task.service";
import type { Subtask, Task } from "@/types/database.types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SnoozeModal } from "@/components/dashboard/SnoozeModal";
import { SkipModal } from "@/components/dashboard/SkipModal";
import { PauseModal } from "@/components/dashboard/PauseModal";
import { isPaused } from "@/lib/taskFormat";
import {
  cancelCommit,
  deferCommit,
  UNDO_WINDOW_MS,
} from "@/lib/deferredCommit";
import { requireOnline } from "@/lib/offline";

/** Offline mode is read-only: every change is wrapped in this check. */
function whenOnline<A extends unknown[], R>(
  fn: (...args: A) => R,
  offlineResult?: R,
): (...args: A) => R {
  return (...args) => (requireOnline() ? fn(...args) : (offlineResult as R));
}

const completedMessage = (task: Task) =>
  task.task_type === "recurring"
    ? "Done! Next occurrence scheduled."
    : "Task completed";

/**
 * All task mutations used by the task list and the task page, with optimistic
 * updates against the shared store and the confirmation dialogs they need.
 * Render `dialogs` once in the consuming component.
 */
export function useTaskActions() {
  const store = useTaskStore();
  const { fetchTasks } = store;
  const openEditTask = useUiStore((s) => s.openEditTask);

  // Dialog state
  const [allDoneTask, setAllDoneTask] = useState<Task | null>(null);
  const [pendingSubtasksTask, setPendingSubtasksTask] = useState<Task | null>(
    null,
  );
  const [snoozeTask, setSnoozeTask] = useState<Task | null>(null);
  const [pauseTarget, setPauseTarget] = useState<Task | null>(null);
  const [skipTarget, setSkipTarget] = useState<{
    task: Task;
    type: "skipped" | "missed";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  // Offer "all done?" only once per completed checklist run
  const allDoneShownRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    for (const t of store.tasks) {
      const subs = t.subtasks ?? [];
      if (!(subs.length > 0 && subs.every((s) => s.completed))) {
        allDoneShownRef.current[t.id] = false;
      }
    }
  }, [store.tasks]);

  // ---- Task completion -------------------------------------------------

  /** Latest copy of a task from the store (callers may hold a stale one). */
  const latest = (task: Task) =>
    useTaskStore.getState().tasks.find((t) => t.id === task.id) ?? task;

  /**
   * Complete immediately in the UI with an Undo toast; the server write
   * (which also rolls recurring tasks over) happens after the undo window.
   */
  const completeTask = (task: Task, markSubtasks = false) => {
    const snapshot = latest(task);
    const completedAt = new Date().toISOString();
    const apply = (t: Task): Task => ({
      ...t,
      status: "completed",
      completed_at: completedAt,
      subtasks: markSubtasks
        ? t.subtasks?.map((s) => ({
            ...s,
            completed: true,
            completed_at: s.completed_at ?? completedAt,
          }))
        : t.subtasks,
    });

    store.updateTaskState(task.id, apply(snapshot));

    const handle = deferCommit(`complete:${task.id}`, {
      overlay: (tasks) => tasks.map((t) => (t.id === task.id ? apply(t) : t)),
      commit: async () => {
        try {
          if (markSubtasks) {
            const open = (snapshot.subtasks ?? []).filter((s) => !s.completed);
            await Promise.all(
              open.map((s) => taskService.toggleSubtask(s.id, true)),
            );
          }
          await taskService.completeTask(snapshot);
        } catch (err) {
          console.error(err);
          toast.error(`Couldn't complete "${snapshot.title}"`);
        } finally {
          fetchTasks(); // reconcile (and pick up recurring rollover)
        }
      },
    });

    toast.success(completedMessage(snapshot), {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          if (!handle.cancel()) return;
          store.updateTaskState(task.id, {
            status: snapshot.status,
            completed_at: snapshot.completed_at,
            subtasks: snapshot.subtasks,
          });
        },
      },
    });
  };

  const reopenTask = async (task: Task) => {
    store.updateTaskState(task.id, { status: "pending", completed_at: null });
    // Unticked within the undo window: the completion never reached the
    // server, so cancelling it is all that's needed.
    if (cancelCommit(`complete:${task.id}`)) return;
    try {
      await taskService.updateTask(task.id, {
        status: "pending",
        completed_at: null,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update task");
      fetchTasks();
    }
  };

  /** Checkbox behaviour: complete (asking about open subtasks) or reopen. */
  const toggleCompletion = (task: Task) => {
    if (isPaused(task)) return; // resume first
    if (task.status === "completed") return reopenTask(task);
    if ((task.subtasks ?? []).some((s) => !s.completed)) {
      setPendingSubtasksTask(task);
      return;
    }
    return completeTask(task);
  };

  // ---- Checklist -------------------------------------------------------

  const toggleSubtask = async (task: Task, subtask: Subtask) => {
    if (subtask.id.startsWith("temp-")) return; // still saving
    const next = !subtask.completed;
    store.toggleSubtaskState(task.id, subtask.id, next);

    const subs = (task.subtasks ?? []).map((s) =>
      s.id === subtask.id ? { ...s, completed: next } : s,
    );
    const allDone = subs.length > 0 && subs.every((s) => s.completed);
    if (
      allDone &&
      task.status !== "completed" &&
      !allDoneShownRef.current[task.id]
    ) {
      allDoneShownRef.current[task.id] = true;
      setTimeout(() => setAllDoneTask(task), 350);
    }

    try {
      await taskService.toggleSubtask(subtask.id, next);
    } catch (err) {
      console.error(err);
      store.toggleSubtaskState(task.id, subtask.id, subtask.completed);
      toast.error("Failed to update checklist item");
    }
  };

  /** Returns false if the add failed (so the caller can restore the input). */
  const addSubtask = async (taskId: string, title: string) => {
    const text = title.trim();
    if (!text) return true;
    const tempId = `temp-${Date.now()}`;
    store.addSubtaskState(taskId, {
      id: tempId,
      task_id: taskId,
      title: text,
      completed: false,
      completed_at: null,
      sort_order: Number.MAX_SAFE_INTEGER, // new items go last until saved
      created_at: new Date().toISOString(),
    });
    try {
      const created = await taskService.addSubtask(taskId, text);
      store.replaceSubtaskState(taskId, tempId, created);
      return true;
    } catch (err) {
      console.error(err);
      store.deleteSubtaskState(taskId, tempId);
      toast.error("Failed to add checklist item");
      return false;
    }
  };

  const renameSubtask = async (
    taskId: string,
    subtaskId: string,
    title: string,
  ) => {
    const text = title.trim();
    if (!text || subtaskId.startsWith("temp-")) return;
    store.updateSubtaskState(taskId, subtaskId, text);
    try {
      await taskService.updateSubtask(subtaskId, text);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update checklist item");
      fetchTasks();
    }
  };

  const deleteSubtask = async (taskId: string, subtaskId: string) => {
    if (subtaskId.startsWith("temp-")) return;
    store.deleteSubtaskState(taskId, subtaskId);
    try {
      await taskService.deleteSubtask(subtaskId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete checklist item");
      fetchTasks();
    }
  };

  // ---- Memory cues -----------------------------------------------------

  const addCue = async (taskId: string, content: string) => {
    const text = content.trim();
    if (!text) return true;
    const tempId = `temp-${Date.now()}`;
    store.addCueState(taskId, {
      id: tempId,
      task_id: taskId,
      content: text,
      created_at: new Date().toISOString(),
    });
    try {
      const created = await taskService.addMemoryCue(taskId, text);
      store.replaceCueState(taskId, tempId, created);
      return true;
    } catch (err) {
      console.error(err);
      store.deleteCueState(tempId);
      toast.error("Failed to add memory cue");
      return false;
    }
  };

  const deleteCue = async (cueId: string) => {
    if (cueId.startsWith("temp-")) return;
    store.deleteCueState(cueId);
    try {
      await taskService.deleteMemoryCue(cueId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete memory cue");
      fetchTasks();
    }
  };

  // ---- Delete ----------------------------------------------------------

  /** Delete immediately in the UI with an Undo toast (no confirm dialog). */
  const deleteTask = (task: Task, onDeleted?: () => void) => {
    const snapshot = latest(task);
    const index = useTaskStore
      .getState()
      .tasks.findIndex((t) => t.id === task.id);
    store.deleteTaskState(task.id);
    onDeleted?.();

    const handle = deferCommit(`delete:${task.id}`, {
      overlay: (tasks) => tasks.filter((t) => t.id !== task.id),
      commit: async () => {
        try {
          await taskService.deleteTask(task.id);
        } catch (err) {
          console.error(err);
          toast.error(`Couldn't delete "${snapshot.title}"`);
          fetchTasks();
        }
      },
    });

    toast("Task deleted", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          if (!handle.cancel()) return;
          useTaskStore.setState((state) => {
            const tasks = [...state.tasks];
            tasks.splice(Math.max(0, index), 0, snapshot);
            return { tasks };
          });
        },
      },
    });
  };

  /** Resume a paused recurring task at its next occurrence from now. */
  const resumeTask = async (task: Task) => {
    const snapshot = latest(task);
    try {
      const update = await taskService.resumeTask(snapshot);
      store.updateTaskState(task.id, update);
      toast.success(`Resumed "${snapshot.title}"`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't resume this task");
    } finally {
      fetchTasks();
    }
  };

  const runBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const pendingCount =
    pendingSubtasksTask?.subtasks?.filter((s) => !s.completed).length ?? 0;

  const dialogs = (
    <>
      <Modal
        isOpen={!!allDoneTask}
        onClose={() => setAllDoneTask(null)}
        title="All done!"
        description={
          allDoneTask ? (
            <>
              Every checklist item is ticked. Mark{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{allDoneTask.title}&rdquo;
              </span>{" "}
              complete?
            </>
          ) : undefined
        }
        variant="success"
        confirmText="Mark complete"
        cancelText="Not yet"
        isLoading={busy}
        onConfirm={() =>
          runBusy(async () => {
            if (allDoneTask) await completeTask(allDoneTask);
            setAllDoneTask(null);
          })
        }
      />

      <Modal
        isOpen={!!pendingSubtasksTask}
        onClose={() => setPendingSubtasksTask(null)}
        title="Unfinished checklist"
        description={
          pendingSubtasksTask ? (
            <>
              <span className="font-semibold text-foreground">
                &ldquo;{pendingSubtasksTask.title}&rdquo;
              </span>{" "}
              still has {pendingCount} open item{pendingCount === 1 ? "" : "s"}.
            </>
          ) : undefined
        }
        variant="warning"
        footer={
          <div className="flex flex-col gap-2 w-full mt-1">
            <Button
              disabled={busy}
              className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm"
              onClick={() =>
                runBusy(async () => {
                  if (pendingSubtasksTask)
                    await completeTask(pendingSubtasksTask, true);
                  setPendingSubtasksTask(null);
                })
              }
            >
              {busy ? <Spinner size="sm" /> : "Tick all & complete"}
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              className="w-full h-11 rounded-xl text-sm font-medium"
              onClick={() =>
                runBusy(async () => {
                  if (pendingSubtasksTask)
                    await completeTask(pendingSubtasksTask, false);
                  setPendingSubtasksTask(null);
                })
              }
            >
              Complete task only
            </Button>
            <button
              onClick={() => setPendingSubtasksTask(null)}
              className="text-sm text-muted-foreground hover:text-foreground py-2"
            >
              Cancel
            </button>
          </div>
        }
      />

      <SnoozeModal
        isOpen={!!snoozeTask}
        onClose={() => setSnoozeTask(null)}
        task={snoozeTask}
        onSuccess={fetchTasks}
      />

      <PauseModal
        isOpen={!!pauseTarget}
        onClose={() => setPauseTarget(null)}
        task={pauseTarget}
        onSuccess={fetchTasks}
      />

      <SkipModal
        isOpen={!!skipTarget}
        onClose={() => setSkipTarget(null)}
        task={skipTarget?.task ?? null}
        actionType={skipTarget?.type ?? "skipped"}
        onSuccess={() => fetchTasks()}
      />
    </>
  );

  return {
    toggleCompletion: whenOnline(toggleCompletion),
    toggleSubtask: whenOnline(toggleSubtask, Promise.resolve()),
    // Resolving false keeps the typed text in the input
    addSubtask: whenOnline(addSubtask, Promise.resolve(false)),
    renameSubtask: whenOnline(renameSubtask, Promise.resolve()),
    deleteSubtask: whenOnline(deleteSubtask, Promise.resolve()),
    addCue: whenOnline(addCue, Promise.resolve(false)),
    deleteCue: whenOnline(deleteCue, Promise.resolve()),
    edit: whenOnline((task: Task) => openEditTask(task.id)),
    requestDelete: whenOnline(deleteTask),
    snooze: whenOnline((task: Task) => setSnoozeTask(task)),
    pause: whenOnline((task: Task) => setPauseTarget(task)),
    resume: whenOnline(resumeTask, Promise.resolve()),
    skip: whenOnline((task: Task, type: "skipped" | "missed") =>
      setSkipTarget({ task, type }),
    ),
    dialogs,
  };
}
