"use client";

import { useState, useEffect, useRef } from "react";
import { useTaskStore } from "@/store/taskStore";
import { taskService } from "@/services/task.service";
import { Task, Subtask, MemoryCue, Tag } from "@/types/database.types";
import { format } from "@/lib/date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FilterSidebar } from "./FilterSidebar";
import { Spinner } from "@/components/ui/spinner";
import { Lightbulb, Repeat, PartyPopper } from "lucide-react";

export function TaskList() {
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

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Local inputs for adding items in expanded view
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<{
    [taskId: string]: string;
  }>({});
  const [newCueTexts, setNewCueTexts] = useState<{ [taskId: string]: string }>(
    {},
  );

  // smart completion prompt state
  const [promptTask, setPromptTask] = useState<Task | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const promptShownRefs = useRef<{ [taskId: string]: boolean }>({});

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

  const handleToggleExpand = (id: string) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  const handleToggleTaskCompletion = async (task: Task) => {
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

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    deleteTaskState(id);
    try {
      await taskService.deleteTask(id);
      toast.success("Task deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete task");
      await fetchTasks(); // rollback
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

  return (
    <div className="space-y-6">
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

            return (
              <div
                key={task.id}
                className={cn(
                  "border border-border bg-card backdrop-blur-md rounded-xl transition-all duration-200 overflow-hidden shadow-md hover:border-brand-indigo/20 dark:hover:border-brand-blue/20",
                  task.status === "completed" && "opacity-60 border-border/50",
                )}
              >
                {/* Collapsed view / Header */}
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTaskCompletion(task)}
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-all",
                        task.status === "completed"
                          ? "bg-brand-green border-brand-green text-white hover:opacity-90 shadow-sm"
                          : "border-border hover:border-brand-indigo/60 dark:hover:border-brand-blue/60 bg-transparent",
                      )}
                    >
                      {task.status === "completed" && (
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M3.75 6.25L5 7.5L8.25 4.25"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Content Summary */}
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => handleToggleExpand(task.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1 cursor-pointer">
                        <h3
                          className={cn(
                            "font-bold text-sm text-foreground truncate",
                            task.status === "completed" &&
                              "line-through text-muted-foreground",
                          )}
                        >
                          {task.title}
                        </h3>

                        {/* Task Type Badge */}
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide uppercase",
                            task.task_type === "flexible" &&
                              "bg-muted text-muted-foreground border border-border",
                            task.task_type === "scheduled" &&
                              "bg-brand-blue/10 text-brand-blue border border-brand-blue/20",
                            task.task_type === "recurring" &&
                              "bg-brand-indigo/10 text-brand-indigo dark:text-brand-blue/90 border border-brand-indigo/20",
                          )}
                        >
                          {task.task_type}
                        </span>

                        {/* Due Date Indicator */}
                        {task.due_date && (
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded font-medium",
                              isOverdue
                                ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                                : "bg-muted text-muted-foreground border border-border",
                            )}
                          >
                            Due: {format(task.due_date, "MMM d, h:mm a")}
                          </span>
                        )}

                        {/* Reminder Indicator */}
                        {task.reminder_at && (
                          <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Reminder:{" "}
                            {format(task.reminder_at, "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>

                      {/* Description snippets */}
                      {task.description && !isExpanded && (
                        <p className="text-xs text-muted-foreground line-clamp-1 cursor-pointer">
                          {task.description}
                        </p>
                      )}

                      {/* Subtasks progress bar */}
                      {subStats && (
                        <div className="mt-2.5 flex items-center gap-2.5 max-w-xs cursor-pointer">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground rounded-full transition-all duration-300"
                              style={{ width: `${subStats.pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                            {subStats.completed}/{subStats.total} subtasks (
                            {subStats.pct}%)
                          </span>
                        </div>
                      )}

                      {/* Tag list badges */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {task.tags.map((tag: Tag) => (
                            <span
                              key={tag.id}
                              className="bg-muted text-[10px] text-muted-foreground border border-border px-2 py-0.5 rounded-full"
                            >
                              #{tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expand toggle trigger */}
                  <button
                    onClick={() => handleToggleExpand(task.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg
                      className={cn(
                        "w-4 h-4 transform transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                    {/* Description & Notes */}
                    {(task.description || task.notes) && (
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
                    )}

                    {/* Subtasks Checklist */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                        Checklist
                      </p>

                      {/* Subtask addition inline */}
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
                          className="text-xs h-9 rounded-xl border-border/80"
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
                          className="text-xs h-9 px-4 rounded-xl font-semibold"
                        >
                          Add
                        </Button>
                      </div>

                      {/* Subtask list */}
                      {task.subtasks && task.subtasks.length > 0 ? (
                        <div className="space-y-2 max-w-xl">
                          {task.subtasks
                            .sort(
                              (a: Subtask, b: Subtask) =>
                                new Date(b.created_at).getTime() -
                                new Date(a.created_at).getTime(),
                            )
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

                      {/* Cue addition inline */}
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
                          className="text-xs h-9 rounded-xl border-border/80"
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
                          className="text-xs h-9 px-4 rounded-xl font-semibold"
                        >
                          Add
                        </Button>
                      </div>

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
                        <Button
                          onClick={() => handleDeleteTask(task.id)}
                          className="bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs border border-destructive/20 py-1 h-7 rounded px-3"
                        >
                          Delete Task
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Smart Completion Prompt Modal */}
      {promptTask && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ animation: "fadeInOverlay 0.2s ease" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setPromptTask(null)}
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
                  &ldquo;{promptTask.title}&rdquo;
                </span>{" "}
                as complete?
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleCompleteTask(promptTask)}
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
                onClick={() => setPromptTask(null)}
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
    </div>
  );
}
