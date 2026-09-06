export type TaskType = "flexible" | "scheduled" | "recurring";
export type TaskStatus = "pending" | "completed";
export type RecurrenceType = "daily" | "weekly" | "monthly" | "yearly";
export type OccurrenceStatus = "completed" | "skipped" | "missed";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  status: TaskStatus;
  recurrence_type: RecurrenceType | null;
  recurrence_interval: number | null;
  recurrence_days: number[] | null;
  due_date: string | null;
  reminder_at: string | null;
  notes: string | null;
  last_completed_at: string | null;
  last_skipped_at?: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  reminder_sent?: boolean;
  due_sent?: boolean;

  // Joined fields
  subtasks?: Subtask[];
  tags?: Tag[];
  memory_cues?: MemoryCue[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: string;
  role: "admin" | "user";
  created_at: string;
}

export interface UserAnnouncement {
  user_id: string;
  announcement_id: string;
  dismissed_at: string;
}

export interface TaskOccurrence {
  id: string;
  task_id: string;
  user_id: string;
  scheduled_date: string;
  action_date: string;
  status: OccurrenceStatus;
  notes?: string | null;
  created_at: string;
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

export interface UserSettings {
  user_id: string;
  max_flexible_nudges_per_day: number;
  enable_idle_nudges: boolean;
  enable_subtask_nudges: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  flexible_nudges_count_today: number;
  last_nudge_date: string | null;
  enable_weekly_report?: boolean;
  enable_monthly_report?: boolean;
  last_weekly_report_date?: string | null;
  last_monthly_report_date?: string | null;
  updated_at: string;
}

export type ReportPeriod = "weekly" | "monthly";

export interface ReportTimeframe {
  period: ReportPeriod;
  startDate: string; // ISO string
  endDate: string; // ISO string
  label: string; // e.g. "Aug 31 – Sep 6, 2026" or "August 2026"
  subLabel: string; // e.g. "Week 36" or "Monthly Review"
  offset: number;
}

export interface DailyActivityPoint {
  date: string; // yyyy-MM-dd
  dayLabel: string; // "Mon", "Tue", etc.
  fullDateLabel: string; // "Sep 1, 2026"
  completedCount: number;
  skippedCount: number;
  totalActionCount: number;
}

export interface ReportTagSummary {
  name: string;
  count: number;
  percentage: number;
}

export interface ReportTaskTypeSummary {
  type: TaskType;
  label: string;
  completed: number;
  percentage: number;
}

export interface CompletedReportItem {
  id: string;
  taskId: string;
  title: string;
  taskType: TaskType;
  completedAt: string;
  hasMemoryCue: boolean;
  cueContent?: string;
  tags: string[];
  subtasksCompleted: number;
  subtasksTotal: number;
}

export interface ReportData {
  timeframe: ReportTimeframe;
  metrics: {
    totalCompleted: number;
    totalScheduled: number;
    totalSkipped: number;
    completionRate: number; // 0-100
    completionRateDelta: number | null; // e.g. +12 or -5 vs previous period
    totalSubtasksCompleted: number;
    recurringAdherenceRate: number; // 0-100
    // Cognitive Cue Impact
    cueCompletionRate: number; // 0-100
    nonCueCompletionRate: number; // 0-100
    cueImpactDelta: number; // difference in percentage points (+25%)
    tasksWithCuesCount: number;
    tasksWithoutCuesCount: number;
    mostProductiveDay: string | null; // e.g. "Wednesday"
    streakDays: number;
  };
  dailyActivity: DailyActivityPoint[];
  taskTypeBreakdown: ReportTaskTypeSummary[];
  topTags: ReportTagSummary[];
  completedItems: CompletedReportItem[];
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
          | "last_skipped_at"
        > & {
          id?: string;
          status?: TaskStatus;
          completed_at?: string | null;
          last_completed_at?: string | null;
          last_skipped_at?: string | null;
        };
        Update: Partial<Task>;
      };
      task_occurrences: {
        Row: TaskOccurrence;
        Insert: Omit<TaskOccurrence, "id" | "created_at" | "action_date"> & {
          id?: string;
          action_date?: string;
          created_at?: string;
        };
        Update: Partial<TaskOccurrence>;
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
      user_settings: {
        Row: UserSettings;
        Insert: Partial<UserSettings> & { user_id: string };
        Update: Partial<UserSettings>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, "created_at"> & { created_at?: string };
        Update: Partial<UserRole>;
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Announcement>;
      };
      user_announcements: {
        Row: UserAnnouncement;
        Insert: Omit<UserAnnouncement, "dismissed_at"> & {
          dismissed_at?: string;
        };
        Update: Partial<UserAnnouncement>;
      };
    };
  };
};
