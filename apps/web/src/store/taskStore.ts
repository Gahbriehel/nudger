/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "@/lib/zustand";
import { Task, Subtask, MemoryCue } from "@/types/database.types";
import { taskService } from "@/services/task.service";

export interface TaskFilters {
  search: string;
  type: "all" | "flexible" | "scheduled" | "recurring";
  status: "all" | "pending" | "completed";
  sort: "recently_updated" | "oldest" | "due_soon" | "most_subtasks";
}

interface TaskState {
  tasks: Task[];
  /** True only during the very first load (no data to show yet). */
  loading: boolean;
  /** True during background refreshes once data has loaded. */
  refreshing: boolean;
  hasLoaded: boolean;
  error: string | null;
  filters: TaskFilters;
  setFilters: (filters: Partial<TaskFilters>) => void;
  fetchTasks: () => Promise<void>;
  addTaskState: (task: Task) => void;
  updateTaskState: (id: string, updates: Partial<Task>) => void;
  deleteTaskState: (id: string) => void;
  toggleSubtaskState: (
    taskId: string,
    subtaskId: string,
    completed: boolean,
  ) => void;
  updateSubtaskState: (
    taskId: string,
    subtaskId: string,
    title: string,
  ) => void;
  deleteSubtaskState: (taskId: string, subtaskId: string) => void;
  addSubtaskState: (taskId: string, subtask: Subtask) => void;
  replaceSubtaskState: (
    taskId: string,
    tempId: string,
    subtask: Subtask,
  ) => void;
  addCueState: (taskId: string, cue: MemoryCue) => void;
  replaceCueState: (taskId: string, tempId: string, cue: MemoryCue) => void;
  deleteCueState: (cueId: string) => void;
}

let inFlight: Promise<void> | null = null;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  refreshing: false,
  hasLoaded: false,
  error: null,
  filters: {
    search: "",
    type: "all",
    status: "all",
    sort: "recently_updated",
  },
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  fetchTasks: async () => {
    // Coalesce concurrent calls into a single request
    if (inFlight) return inFlight;

    // Only show the blocking `loading` state before the first successful
    // load. Later fetches are silent background refreshes so the list never
    // blanks out, collapses, or loses scroll position.
    if (get().hasLoaded) {
      set({ refreshing: true, error: null });
    } else {
      set({ loading: true, error: null });
    }

    inFlight = (async () => {
      try {
        const tasks = await taskService.getTasks();
        set({ tasks, loading: false, refreshing: false, hasLoaded: true });
      } catch (err: any) {
        set({
          error: err.message || "Failed to fetch tasks",
          loading: false,
          refreshing: false,
        });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
  addTaskState: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTaskState: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  deleteTaskState: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
  toggleSubtaskState: (taskId, subtaskId, completed) =>
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = t.subtasks?.map((sub) =>
          sub.id === subtaskId
            ? {
                ...sub,
                completed,
                completed_at: completed ? new Date().toISOString() : null,
              }
            : sub,
        );
        return { ...t, subtasks };
      }),
    })),
  updateSubtaskState: (taskId, subtaskId, title) =>
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = t.subtasks?.map((sub) =>
          sub.id === subtaskId ? { ...sub, title } : sub,
        );
        return { ...t, subtasks };
      }),
    })),
  addSubtaskState: (taskId, subtask) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...(t.subtasks || []), subtask] }
          : t,
      ),
    })),
  replaceSubtaskState: (taskId, tempId, subtask) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks?.map((s) => (s.id === tempId ? subtask : s)),
            }
          : t,
      ),
    })),
  addCueState: (taskId, cue) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, memory_cues: [...(t.memory_cues || []), cue] }
          : t,
      ),
    })),
  replaceCueState: (taskId, tempId, cue) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              memory_cues: t.memory_cues?.map((c) =>
                c.id === tempId ? cue : c,
              ),
            }
          : t,
      ),
    })),
  deleteCueState: (cueId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.memory_cues?.some((c) => c.id === cueId)
          ? { ...t, memory_cues: t.memory_cues.filter((c) => c.id !== cueId) }
          : t,
      ),
    })),
  deleteSubtaskState: (taskId, subtaskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = t.subtasks?.filter((sub) => sub.id !== subtaskId);
        return { ...t, subtasks };
      }),
    })),
}));
