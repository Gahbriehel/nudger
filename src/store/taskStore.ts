/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "@/lib/zustand";
import { Task } from "@/types/database.types";
import { taskService } from "@/services/task.service";

export interface TaskFilters {
  search: string;
  type: "all" | "flexible" | "scheduled" | "recurring";
  status: "all" | "pending" | "completed";
  sort: "recently_updated" | "oldest" | "due_soon" | "most_subtasks";
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
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
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
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
    set({ loading: true, error: null });
    try {
      const tasks = await taskService.getTasks();
      set({ tasks, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch tasks", loading: false });
    }
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
          sub.id === subtaskId ? { ...sub, completed } : sub,
        );
        return { ...t, subtasks };
      }),
    })),
}));
