"use client";

import { useState, useEffect, useRef } from "react";
import { useTaskStore } from "@/store/taskStore";
import { taskService } from "@/services/task.service";
import {
  Task,
  Subtask,
  MemoryCue,
  Tag,
  TaskType,
  RecurrenceType,
} from "@/types/database.types";
import { format } from "@/lib/date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FilterSidebar } from "./FilterSidebar";
import { Spinner } from "@/components/ui/spinner";
import { SnoozeModal } from "./SnoozeModal";
import { Lightbulb, Repeat, Moon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { tagService } from "@/services/tag.service";

interface TaskListProps {
  initialExpandedTaskId?: string | null;
}

export function TaskList({ initialExpandedTaskId }: TaskListProps = {}) {
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const {
    tasks,
    loading,
    filters,
    setFilters,
    fetchTasks,
    toggleSubtaskState,
    deleteTaskState,
  } = useTaskStore();

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(
    initialExpandedTaskId ?? null,
  );

  // Local inputs for adding items in expanded view
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<{
    [taskId: string]: string;
  }>({});
  const [newCueTexts, setNewCueTexts] = useState<{ [taskId: string]: string }>(
    {},
  );

  // smart completion prompt state (triggered when all subtasks are ticked)
  const [promptTask, setPromptTask] = useState<Task | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const promptShownRefs = useRef<{ [taskId: string]: boolean }>({});

  // subtask completion prompt state (triggered when completing a task with pending subtasks)
  const [subtaskPromptTask, setSubtaskPromptTask] = useState<Task | null>(null);
  const [isCompletingWithSubtasks, setIsCompletingWithSubtasks] =
    useState(false);

  // task deletion confirmation modal state
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(
    null,
  );
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // task snooze modal state
  const [snoozeTask, setSnoozeTask] = useState<Task | null>(null);

  // Track task currently in Edit Mode
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Local state for editing fields
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTaskType, setEditTaskType] = useState<string>("flexible");
  const [editDueDate, setEditDueDate] = useState("");
  const [editReminderAt, setEditReminderAt] = useState("");
  const [editRecurrenceType, setEditRecurrenceType] = useState("daily");
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState("1");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  useEffect(() => {
    tagService
      .getTags()
      .then(setAvailableTags)
      .catch((err) => console.error("Error fetching tags:", err));
  }, []);

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditNotes(task.notes || "");
    setEditTaskType(task.task_type);

    // Formatting date strings to datetime-local format: YYYY-MM-DDThh:mm
    const formatDateForInput = (dateStr?: string | null) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      const pad = (num: number) => String(num).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEditDueDate(formatDateForInput(task.due_date));
    setEditReminderAt(formatDateForInput(task.reminder_at));
    setEditRecurrenceType(task.recurrence_type || "daily");
    setEditRecurrenceInterval(String(task.recurrence_interval || 1));
    setEditTags(task.tags?.map((t) => t.name) || []);
    setNewTagInput("");
  };

  const handleAddEditTag = () => {
    const cleanTag = newTagInput.trim().toLowerCase();
    if (cleanTag && !editTags.includes(cleanTag)) {
      setEditTags([...editTags, cleanTag]);
      setNewTagInput("");
    }
  };

  const handleToggleEditAvailableTag = (tagName: string) => {
    if (editTags.includes(tagName)) {
      setEditTags(editTags.filter((t) => t !== tagName));
    } else {
      setEditTags([...editTags, tagName]);
    }
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSavingEdit(true);
    try {
      const interval = editRecurrenceInterval
        ? parseInt(editRecurrenceInterval, 10)
        : null;

      const updates = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        task_type: editTaskType as TaskType,
        due_date:
          editTaskType !== "flexible" && editDueDate
            ? new Date(editDueDate).toISOString()
            : null,
        reminder_at:
          editTaskType !== "flexible" && editReminderAt
            ? new Date(editReminderAt).toISOString()
            : null,
        recurrence_type:
          editTaskType === "recurring"
            ? (editRecurrenceType as RecurrenceType)
            : null,
        recurrence_interval:
          editTaskType === "recurring" ? interval || 1 : null,
        notes: editNotes.trim() || null,
      };

      // 1. Update core task properties
      await taskService.updateTask(taskId, updates);

      // 2. Update task tags
      await taskService.updateTaskTags(taskId, editTags);

      toast.success("Task updated successfully");
      setEditingTaskId(null);
      await fetchTasks();

      // Refresh available tags list in case a new tag was created
      const freshTags = await tagService.getTags();
      setAvailableTags(freshTags);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update task");
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    tasks.forEach((task) => {
      if (task.subtasks) {
        const allComplete =
          task.subtasks.length > 0 && task.subtasks.every((s) => s.completed);
        if (!allComplete) {
          promptShownRefs.current[task.id] = false;
        }
      }
    });
  }, [tasks]);

  // Fetch tasks on load
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Scroll to the initially-expanded task once tasks are loaded
  useEffect(() => {
    if (!initialExpandedTaskId || !tasks.length) return;
    const el = document.getElementById(`task-card-${initialExpandedTaskId}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [initialExpandedTaskId, tasks.length]);

  const handleToggleExpand = (id: string) => {
    if (expandedTaskId === id) {
      setExpandedTaskId(null);
      setEditingTaskId(null);
    } else {
      setExpandedTaskId(id);
      setEditingTaskId(null);
    }
  };

  const handleToggleTaskCompletion = async (task: Task) => {
    // If marking complete and there are still pending subtasks, prompt first
    if (
      task.status !== "completed" &&
      task.subtasks &&
      task.subtasks.some((s) => !s.completed)
    ) {
      setSubtaskPromptTask(task);
      return;
    }

    try {
      const originalStatus = task.status;

      // Optimistic update
      const nowStr = new Date().toISOString();
      let nextStatus = originalStatus;

      if (task.task_type === "recurring" && task.recurrence_type) {
        // Just reload after call since recurring math happens in service
      } else {
        nextStatus = originalStatus === "completed" ? "pending" : "completed";
      }

      useTaskStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: nextStatus,
                completed_at: nextStatus === "completed" ? nowStr : null,
              }
            : t,
        ),
      }));

      // Call service
      if (originalStatus === "completed") {
        // Reset to pending
        await taskService.updateTask(task.id, {
          status: "pending",
          completed_at: null,
        });
        await fetchTasks();
        toast.success("Task marked as pending");
      } else {
        // Complete (and rollover if recurring)
        await taskService.completeTask(task);
        await fetchTasks();
        toast.success(
          task.task_type === "recurring"
            ? "Recurring task completed! Next occurrence scheduled."
            : "Task completed!",
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update task completion");
      await fetchTasks(); // rollback
    }
  };

  const handleToggleSubtask = async (taskId: string, subtask: Subtask) => {
    const nextVal = !subtask.completed;

    // Find task in local store
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // construct updated subtasks array to check completion state
    const updatedSubtasks = task.subtasks?.map((s) =>
      s.id === subtask.id ? { ...s, completed: nextVal } : s,
    );

    const allComplete =
      !!updatedSubtasks &&
      updatedSubtasks.length > 0 &&
      updatedSubtasks.every((s) => s.completed);

    toggleSubtaskState(taskId, subtask.id, nextVal);

    if (
      allComplete &&
      !promptShownRefs.current[taskId] &&
      task.status !== "completed"
    ) {
      promptShownRefs.current[taskId] = true;
      setTimeout(() => setPromptTask(task), 350);
    }

    try {
      await taskService.toggleSubtask(subtask.id, nextVal);
      if (!allComplete) {
        toast.success(
          nextVal ? "Subtask completed" : "Subtask marked as pending",
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update subtask");
      toggleSubtaskState(taskId, subtask.id, subtask.completed); // rollback
    }
  };

  const handleCompleteTask = async (taskToComplete: Task) => {
    setIsCompletingTask(true);
    try {
      await taskService.completeTask(taskToComplete);
      await fetchTasks();
      toast.success(
        taskToComplete.task_type === "recurring"
          ? "Recurring task completed! Next occurrence scheduled."
          : "Task completed!",
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete task");
    } finally {
      setIsCompletingTask(false);
      setPromptTask(null);
    }
  };

  // Complete a task and optionally bulk-mark all its subtasks as done first
  const handleCompleteWithSubtasks = async (
    task: Task,
    markSubtasks: boolean,
  ) => {
    setIsCompletingWithSubtasks(true);
    try {
      if (markSubtasks && task.subtasks && task.subtasks.length > 0) {
        // Bulk-complete all pending subtasks in parallel
        const pending = task.subtasks.filter((s) => !s.completed);
        await Promise.all(
          pending.map((s) => taskService.toggleSubtask(s.id, true)),
        );
      }
      await taskService.completeTask(task);
      await fetchTasks();
      toast.success(
        task.task_type === "recurring"
          ? "Recurring task completed! Next occurrence scheduled."
          : "Task completed!",
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete task");
    } finally {
      setIsCompletingWithSubtasks(false);
      setSubtaskPromptTask(null);
    }
  };

  const handleAddSubtask = async (taskId: string) => {
    const text = newSubtaskTexts[taskId]?.trim();
    if (!text) return;

    try {
      await taskService.addSubtask(taskId, text);
      setNewSubtaskTexts({ ...newSubtaskTexts, [taskId]: "" });
      await fetchTasks();
      toast.success("Subtask added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add subtask");
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await taskService.deleteSubtask(subtaskId);
      await fetchTasks();
      toast.success("Subtask deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete subtask");
    }
  };

  const handleAddCue = async (taskId: string) => {
    const text = newCueTexts[taskId]?.trim();
    if (!text) return;

    try {
      await taskService.addMemoryCue(taskId, text);
      setNewCueTexts({ ...newCueTexts, [taskId]: "" });
      await fetchTasks();
      toast.success("Memory cue added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add memory cue");
    }
  };

  const handleDeleteCue = async (cueId: string) => {
    try {
      await taskService.deleteMemoryCue(cueId);
      await fetchTasks();
      toast.success("Memory cue deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete memory cue");
    }
  };

  const handleDeleteTask = (id: string) => {
    setDeleteConfirmTaskId(id);
  };

  const handleConfirmDeleteTask = async () => {
    if (!deleteConfirmTaskId) return;
    const id = deleteConfirmTaskId;
    setIsDeletingTask(true);
    deleteTaskState(id);
    try {
      await taskService.deleteTask(id);
      toast.success("Task deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete task");
      await fetchTasks(); // rollback
    } finally {
      setIsDeletingTask(false);
      setDeleteConfirmTaskId(null);
    }
  };

  // Filter & Sort tasks locally
  const filteredTasks = tasks
    .filter((task: Task) => {
      // search filter
      const term = filters.search.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(term) ||
        (task.description && task.description.toLowerCase().includes(term)) ||
        (task.notes && task.notes.toLowerCase().includes(term)) ||
        (task.tags &&
          task.tags.some((tag) => tag.name.toLowerCase().includes(term)));

      // type filter
      const matchesType =
        filters.type === "all" || task.task_type === filters.type;

      // status filter
      const matchesStatus =
        filters.status === "all" || task.status === filters.status;

      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a: Task, b: Task) => {
      // Primary sort: pending first, completed last
      const aCompleted = a.status === "completed";
      const bCompleted = b.status === "completed";
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }

      // Secondary sort: user-selected sort option
      if (filters.sort === "recently_updated") {
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }
      if (filters.sort === "oldest") {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      if (filters.sort === "due_soon") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (filters.sort === "most_subtasks") {
        const aSubs = a.subtasks?.length || 0;
        const bSubs = b.subtasks?.length || 0;
        return bSubs - aSubs;
      }
      return 0;
    });

  const getSubtaskCompletionStats = (task: Task) => {
    const subs = task.subtasks || [];
    if (subs.length === 0) return null;
    const completed = subs.filter((s) => s.completed).length;
    const pct = Math.round((completed / subs.length) * 100);
    return { completed, total: subs.length, pct };
  };

  const nowTime = new Date().getTime();

  // Count active non-default filters (excludes search)
  const activeFilterCount = [
    filters.type !== "all" ? 1 : 0,
    filters.status !== "all" ? 1 : 0,
    filters.sort !== "recently_updated" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const today = new Date();
  const totalPending = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="space-y-6">
      {/* Date Header Strip */}
      <div className="border border-border bg-card rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-end gap-2 leading-none">
            <span className="text-4xl font-black text-foreground">
              {format(today, "d")}
            </span>
            <span className="text-2xl font-bold text-foreground mb-0.5">
              {format(today, "MMMM")}
            </span>
          </div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground mt-1 uppercase">
            {format(today, "EEEE")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <span className="font-semibold">
            {totalPending} To-do{totalPending !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      {/* Filter Sidebar */}
      <FilterSidebar
        open={filterSidebarOpen}
        onClose={() => setFilterSidebarOpen(false)}
      />

      {/* Simplified Filter Bar: Search + Filters Button */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            id="search-input"
            placeholder="Search title, tags, notes..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="text-xs h-10 pl-9 pr-3"
          />
        </div>

        {/* Filters Trigger Button */}
        <button
          id="open-filters-btn"
          onClick={() => setFilterSidebarOpen(true)}
          className={cn(
            "relative flex items-center gap-2 h-10 px-4 rounded-lg border text-xs font-semibold transition-all duration-150 whitespace-nowrap",
            activeFilterCount > 0
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground border-border hover:border-foreground/30 hover:bg-muted",
          )}
        >
          <svg
            className="w-3.5 h-3.5"
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
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-background/20 text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Task Cards List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="md" label="Loading tasks..." />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
          No tasks found matching current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task: Task) => {
            const isExpanded = expandedTaskId === task.id;
            const subStats = getSubtaskCompletionStats(task);
            const isOverdue =
              task.status !== "completed" &&
              task.due_date &&
              new Date(task.due_date).getTime() < nowTime;

            const borderLeftClass =
              task.status === "completed"
                ? "border-l-4 border-l-muted-foreground/30"
                : task.task_type === "flexible"
                  ? "border-l-4 border-l-sky-500"
                  : task.task_type === "scheduled"
                    ? "border-l-4 border-l-rose-500"
                    : "border-l-4 border-l-violet-500";

            return (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                className={cn(
                  "border border-border bg-card backdrop-blur-md rounded-xl transition-all duration-200 overflow-hidden shadow-md hover:border-brand-indigo/20 dark:hover:border-brand-blue/20",
                  borderLeftClass,
                  task.status === "completed" && "opacity-60 border-border/50",
                )}
              >
                {/* Collapsed view / Header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => handleToggleExpand(task.id)}
                >
                  {/* Title row + badges */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Checkbox to quickly mark complete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskCompletion(task);
                        }}
                        className="mt-0.5 flex-shrink-0 focus:outline-none"
                        aria-label={
                          task.status === "completed"
                            ? "Mark task pending"
                            : "Mark task complete"
                        }
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                            task.status === "completed"
                              ? "bg-foreground border-foreground text-background"
                              : "border-muted-foreground/60 hover:border-foreground/80",
                          )}
                        >
                          {task.status === "completed" && (
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
                      </button>
                      <h3
                        className={cn(
                          "font-bold text-base text-foreground leading-snug",
                          task.status === "completed" &&
                            "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {/* Priority / type badge */}
                      <span
                        className={cn(
                          "text-[11px] px-3 py-1 rounded-full font-bold tracking-wide uppercase",
                          task.task_type === "flexible" &&
                            "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20",
                          task.task_type === "scheduled" &&
                            "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30",
                          task.task_type === "recurring" &&
                            "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30",
                        )}
                      >
                        {task.task_type === "flexible"
                          ? "FLEX"
                          : task.task_type === "scheduled"
                            ? "SCHEDULED"
                            : "RECURRING"}
                      </span>
                      {/* Status badge */}
                      <span
                        className={cn(
                          "text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide uppercase border",
                          task.status === "completed"
                            ? "bg-transparent text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/40"
                            : "bg-transparent text-muted-foreground border-border",
                        )}
                      >
                        {task.status === "completed" ? "DONE" : "PENDING"}
                      </span>
                    </div>
                  </div>

                  {/* Description snippet */}
                  {task.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                      {task.description}
                    </p>
                  )}

                  {/* Due date row */}
                  {task.due_date && (
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isOverdue
                            ? "text-red-500 dark:text-red-400"
                            : "text-muted-foreground",
                        )}
                      >
                        Due {format(task.due_date, "MMM d, yyyy")}
                      </span>
                      {task.status !== "completed" &&
                        task.task_type !== "flexible" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSnoozeTask(task);
                            }}
                            title="Snooze task"
                            className="ml-1 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                          >
                            <Moon className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                  )}

                  {/* Subtask progress */}
                  {subStats && (
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[140px]">
                        <div
                          className="h-full bg-foreground rounded-full transition-all duration-300"
                          style={{ width: `${subStats.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                        {subStats.completed}/{subStats.total} to-dos
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags.map((tag: Tag) => (
                        <span
                          key={tag.id}
                          className="text-[11px] bg-brand-indigo/5 text-brand-indigo dark:text-brand-blue border border-brand-indigo/10 px-2.5 py-0.5 rounded-full font-medium"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                    {editingTaskId === task.id ? (
                      // Edit Mode View
                      <div className="space-y-4 text-xs">
                        {/* Title input */}
                        <div className="grid gap-1">
                          <Label
                            htmlFor={`edit-title-${task.id}`}
                            className="font-semibold text-muted-foreground text-[11px]"
                          >
                            Title
                          </Label>
                          <Input
                            id={`edit-title-${task.id}`}
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
                              htmlFor={`edit-desc-${task.id}`}
                              className="font-semibold text-muted-foreground text-[11px]"
                            >
                              Description
                            </Label>
                            <Textarea
                              id={`edit-desc-${task.id}`}
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              className="text-xs rounded-xl min-h-[70px] border-border/80 bg-background"
                              placeholder="Task description"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label
                              htmlFor={`edit-notes-${task.id}`}
                              className="font-semibold text-muted-foreground text-[11px]"
                            >
                              Reference Notes
                            </Label>
                            <Textarea
                              id={`edit-notes-${task.id}`}
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
                              htmlFor={`edit-type-${task.id}`}
                              className="font-semibold text-muted-foreground text-[11px]"
                            >
                              Task Type
                            </Label>
                            <select
                              id={`edit-type-${task.id}`}
                              value={editTaskType}
                              onChange={(e) => setEditTaskType(e.target.value)}
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
                                  htmlFor={`edit-due-${task.id}`}
                                  className="font-semibold text-muted-foreground text-[11px]"
                                >
                                  Due Date
                                </Label>
                                <Input
                                  id={`edit-due-${task.id}`}
                                  type="datetime-local"
                                  value={editDueDate}
                                  onChange={(e) =>
                                    setEditDueDate(e.target.value)
                                  }
                                  className="text-xs h-9 rounded-xl border-border/80 bg-background"
                                />
                              </div>
                              <div className="grid gap-1">
                                <Label
                                  htmlFor={`edit-reminder-${task.id}`}
                                  className="font-semibold text-muted-foreground text-[11px]"
                                >
                                  Reminder
                                </Label>
                                <Input
                                  id={`edit-reminder-${task.id}`}
                                  type="datetime-local"
                                  value={editReminderAt}
                                  onChange={(e) =>
                                    setEditReminderAt(e.target.value)
                                  }
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
                                htmlFor={`edit-recurrence-type-${task.id}`}
                                className="font-semibold text-muted-foreground text-[11px]"
                              >
                                Recurrence Interval
                              </Label>
                              <select
                                id={`edit-recurrence-type-${task.id}`}
                                value={editRecurrenceType}
                                onChange={(e) =>
                                  setEditRecurrenceType(e.target.value)
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
                                htmlFor={`edit-recurrence-interval-${task.id}`}
                                className="font-semibold text-muted-foreground text-[11px]"
                              >
                                Repeat Every
                              </Label>
                              <Input
                                id={`edit-recurrence-interval-${task.id}`}
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

                        {/* Tags editing */}
                        <div className="space-y-2">
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
                                  onClick={() =>
                                    handleToggleEditAvailableTag(t)
                                  }
                                >
                                  #{t}
                                  <span className="text-[9px] opacity-60">
                                    ×
                                  </span>
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
                                      onClick={() =>
                                        handleToggleEditAvailableTag(tag.name)
                                      }
                                      className="bg-muted hover:bg-muted/80 border border-border text-[10px] text-foreground px-2 py-0.5 rounded-full transition-all"
                                    >
                                      #{tag.name}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // View Mode (Default fields - description, notes)
                      (task.description || task.notes) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {task.description && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                                Description
                              </p>
                              <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-2.5 rounded border border-border">
                                {task.description}
                              </p>
                            </div>
                          )}
                          {task.notes && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                                Reference Notes
                              </p>
                              <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-2.5 rounded border border-border">
                                {task.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* Subtasks Checklist */}
                    <div className="space-y-2.5">
                      <div className="border-t border-border pt-3">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest mb-2.5">
                          To-Dos
                        </p>
                      </div>

                      {/* Subtask addition inline - always visible for checklists */}
                      <div className="flex gap-2 max-w-md">
                        <Input
                          placeholder="Add checklist item..."
                          value={newSubtaskTexts[task.id] || ""}
                          onChange={(e) =>
                            setNewSubtaskTexts({
                              ...newSubtaskTexts,
                              [task.id]: e.target.value,
                            })
                          }
                          className="text-xs h-9 rounded-xl border-border/80 bg-background"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSubtask(task.id);
                            }
                          }}
                        />
                        <Button
                          onClick={() => handleAddSubtask(task.id)}
                          variant="outline"
                          className="text-xs h-9 px-4 rounded-xl font-semibold border-border/80"
                        >
                          Add
                        </Button>
                      </div>

                      {/* Subtask list */}
                      {task.subtasks && task.subtasks.length > 0 ? (
                        <div className="space-y-2 max-w-xl">
                          {task.subtasks
                            .sort((a: Subtask, b: Subtask) => {
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
                            .map((sub: Subtask) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between bg-muted/30 dark:bg-[#131920] border border-border/80 dark:border-[#222A35]/50 px-4 py-3 rounded-2xl text-xs transition-all hover:bg-muted/40 dark:hover:bg-[#171E27]"
                              >
                                <label className="flex items-center gap-3 cursor-pointer flex-1 text-foreground">
                                  <input
                                    type="checkbox"
                                    checked={sub.completed}
                                    onChange={() =>
                                      handleToggleSubtask(task.id, sub)
                                    }
                                    className="sr-only"
                                  />
                                  <div
                                    className={cn(
                                      "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
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
                                {editingTaskId === task.id && (
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
                        <p className="text-[11px] text-muted-foreground">
                          No subtasks added yet.
                        </p>
                      )}
                    </div>

                    {/* Memory Cues List */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                        Memory Cues
                      </p>

                      {/* Cue addition inline - visible only in Edit Mode */}
                      {editingTaskId === task.id && (
                        <div className="flex gap-2 max-w-md">
                          <Input
                            placeholder="e.g. Place server logs spreadsheet on secondary monitor, post-it on screen..."
                            value={newCueTexts[task.id] || ""}
                            onChange={(e) =>
                              setNewCueTexts({
                                ...newCueTexts,
                                [task.id]: e.target.value,
                              })
                            }
                            className="text-xs h-9 rounded-xl border-border/80 bg-background"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCue(task.id);
                              }
                            }}
                          />
                          <Button
                            onClick={() => handleAddCue(task.id)}
                            variant="outline"
                            className="text-xs h-9 px-4 rounded-xl font-semibold border-border/80"
                          >
                            Add
                          </Button>
                        </div>
                      )}

                      {/* Cue list */}
                      {task.memory_cues && task.memory_cues.length > 0 ? (
                        <div className="space-y-2 max-w-xl">
                          {task.memory_cues.map((cue: MemoryCue) => (
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
                              {editingTaskId === task.id && (
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
                        <p className="text-[11px] text-muted-foreground">
                          No memory cues added yet.
                        </p>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex flex-wrap items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground gap-3">
                      <div>
                        {task.task_type === "recurring" &&
                          task.recurrence_type && (
                            <span className="text-emerald-600 dark:text-emerald-400 mr-3 inline-flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              Repeats: {task.recurrence_type} (Every{" "}
                              {task.recurrence_interval || 1} units)
                            </span>
                          )}
                        <span>Created: {format(task.created_at, "PP")}</span>
                        {task.completed_at && (
                          <span className="ml-3 text-green-600 dark:text-green-400">
                            Completed: {format(task.completed_at, "PP")}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {editingTaskId === task.id ? (
                          <>
                            <Button
                              onClick={() => handleSaveEdit(task.id)}
                              disabled={isSavingEdit}
                              className="bg-brand-indigo hover:bg-brand-indigo/90 text-white text-xs font-semibold py-1 h-7 rounded px-3 transition-all"
                            >
                              {isSavingEdit ? (
                                <Spinner size="sm" />
                              ) : (
                                "Save Changes"
                              )}
                            </Button>
                            <Button
                              onClick={() => setEditingTaskId(null)}
                              disabled={isSavingEdit}
                              variant="outline"
                              className="text-xs border border-border py-1 h-7 rounded px-3 font-semibold transition-all"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-xs border border-red-300 dark:border-red-500/40 text-red-500 dark:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 py-1.5 h-8 rounded-xl px-3.5 font-semibold transition-all flex items-center gap-1.5"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </Button>
                            <Button
                              onClick={() => startEditing(task)}
                              variant="outline"
                              className="text-xs border border-border py-1.5 h-8 rounded-xl px-3.5 font-semibold transition-all hover:bg-muted flex items-center gap-1.5"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                              Edit
                            </Button>

                            <Button
                              onClick={() => handleToggleTaskCompletion(task)}
                              className={cn(
                                "text-xs border py-1.5 h-8 rounded-xl px-3.5 font-semibold transition-all",
                                task.status === "completed"
                                  ? "bg-muted hover:bg-muted/80 text-muted-foreground border-border"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-background border-transparent",
                              )}
                            >
                              {task.status === "completed"
                                ? "Mark Pending"
                                : "Mark Complete"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Delete Task Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmTaskId}
        onClose={() => setDeleteConfirmTaskId(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        variant="destructive"
        confirmText="Yes, delete task"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteTask}
        isLoading={isDeletingTask}
      />

      {/* Smart Completion Prompt Modal */}
      <Modal
        isOpen={!!promptTask}
        onClose={() => setPromptTask(null)}
        title="All done!"
        description={
          promptTask ? (
            <>
              You&apos;ve completed every checklist item.
              <br />
              Ready to mark{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{promptTask.title}&rdquo;
              </span>{" "}
              as complete?
            </>
          ) : undefined
        }
        variant="success"
        confirmText="Yes, mark as complete"
        cancelText="Not yet"
        onConfirm={() => {
          if (promptTask) handleCompleteTask(promptTask);
        }}
        isLoading={isCompletingTask}
      />

      {/* Pending Subtasks Completion Prompt */}
      <Modal
        isOpen={!!subtaskPromptTask}
        onClose={() => setSubtaskPromptTask(null)}
        title="Unfinished subtasks"
        description={
          subtaskPromptTask ? (
            <>
              <span className="font-semibold text-foreground">
                &ldquo;{subtaskPromptTask.title}&rdquo;
              </span>{" "}
              still has{" "}
              <span className="font-semibold text-foreground">
                {subtaskPromptTask.subtasks?.filter((s) => !s.completed).length}
              </span>{" "}
              pending subtask
              {(subtaskPromptTask.subtasks?.filter((s) => !s.completed)
                .length ?? 0) > 1
                ? "s"
                : ""}
              .
              <br />
              Mark them all complete too?
            </>
          ) : undefined
        }
        variant="warning"
        footer={
          <div className="flex flex-col gap-2 w-full mt-1">
            <Button
              onClick={() =>
                subtaskPromptTask &&
                handleCompleteWithSubtasks(subtaskPromptTask, true)
              }
              disabled={isCompletingWithSubtasks}
              className="w-full h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              {isCompletingWithSubtasks ? (
                <>
                  <Spinner size="sm" />
                  Completing...
                </>
              ) : (
                "Mark all & complete"
              )}
            </Button>
            <Button
              onClick={() =>
                subtaskPromptTask &&
                handleCompleteWithSubtasks(subtaskPromptTask, false)
              }
              disabled={isCompletingWithSubtasks}
              variant="outline"
              className="w-full h-9 rounded-xl text-sm font-medium"
            >
              Just complete the task
            </Button>
            <button
              onClick={() => setSubtaskPromptTask(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              Cancel
            </button>
          </div>
        }
      />

      {/* Snooze Task Modal */}
      <SnoozeModal
        isOpen={!!snoozeTask}
        onClose={() => setSnoozeTask(null)}
        task={snoozeTask}
        onSuccess={fetchTasks}
      />
    </div>
  );
}
