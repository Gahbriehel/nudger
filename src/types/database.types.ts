export type TaskType = "flexible" | "scheduled" | "recurring";
export type TaskStatus = "pending" | "completed";
export type RecurrenceType = "daily" | "weekly" | "monthly" | "yearly";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  status: TaskStatus;
  recurrence_type: RecurrenceType | null;
  recurrence_interval: number | null;
  due_date: string | null;
  reminder_at: string | null;
  notes: string | null;
  last_completed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  subtasks?: Subtask[];
  tags?: Tag[];
  memory_cues?: MemoryCue[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}

export interface MemoryCue {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
}

// Supabase Database Type Helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: Omit<
          Task,
          | "id"
          | "created_at"
          | "updated_at"
          | "status"
          | "completed_at"
          | "last_completed_at"
        > & {
          id?: string;
          status?: TaskStatus;
          completed_at?: string | null;
          last_completed_at?: string | null;
        };
        Update: Partial<Task>;
      };
      subtasks: {
        Row: Subtask;
        Insert: Omit<Subtask, "id" | "created_at" | "completed"> & {
          id?: string;
          completed?: boolean;
        };
        Update: Partial<Subtask>;
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, "id" | "created_at"> & { id?: string };
        Update: Partial<Tag>;
      };
      task_tags: {
        Row: TaskTag;
        Insert: TaskTag;
        Update: Partial<TaskTag>;
      };
      task_memory_cues: {
        Row: MemoryCue;
        Insert: Omit<MemoryCue, "id" | "created_at"> & { id?: string };
        Update: Partial<MemoryCue>;
      };
    };
  };
};
