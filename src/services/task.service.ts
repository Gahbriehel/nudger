/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import { Task, Subtask, Tag, MemoryCue } from "@/types/database.types";
import { getRandomReminderTime } from "@/lib/utils";

const supabase = createClient();

export function calculateInitialDueDate(
  startDate: Date,
  recurrenceDays: number[],
): string {
  const currentDay = startDate.getDay();
  if (recurrenceDays.includes(currentDay)) {
    return startDate.toISOString();
  }
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + i);
    if (recurrenceDays.includes(nextDate.getDay())) {
      return nextDate.toISOString();
    }
  }
  return startDate.toISOString();
}

function calculateNextDueDate(
  dueDateStr: string | null,
  type: string,
  interval: number,
  recurrenceDays: number[] | null = null,
): string | null {
  if (!dueDateStr) return null;
  const date = new Date(dueDateStr);

  if (type === "weekly" && recurrenceDays && recurrenceDays.length > 0) {
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + i);
      if (recurrenceDays.includes(nextDate.getDay())) {
        return nextDate.toISOString();
      }
    }
  }

  const add = interval || 1;

  switch (type) {
    case "daily":
      date.setDate(date.getDate() + add);
      break;
    case "weekly":
      date.setDate(date.getDate() + add * 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + add);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + add);
      break;
    default:
      return null;
  }
  return date.toISOString();
}

export const taskService = {
  async getTasks(): Promise<Task[]> {
    // We join subtasks, cues, and tag relationships
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        subtasks (*),
        task_memory_cues (*),
        task_tags (
          tag:tags (*)
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((task: any) => {
      // Map Supabase nested join data to flat tags array
      const tags = (task.task_tags || [])
        .map((tt: any) => tt.tag)
        .filter(Boolean);
      const mappedTask = {
        ...task,
        tags,
        memory_cues: task.task_memory_cues || [],
      } as Task;

      // Silent reset for overdue recurring tasks that are marked completed
      if (
        mappedTask.task_type === "recurring" &&
        mappedTask.status === "completed" &&
        mappedTask.due_date &&
        new Date(mappedTask.due_date) <= new Date()
      ) {
        mappedTask.status = "pending";
        if (mappedTask.subtasks) {
          mappedTask.subtasks = mappedTask.subtasks.map((st: any) => ({
            ...st,
            completed: false,
          }));
        }
        taskService.resetRecurringTask(mappedTask.id).catch((err) => {
          console.error("Failed to silently reset recurring task:", err);
        });
      }

      return mappedTask;
    });
  },

  async getTaskById(id: string): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        subtasks (*),
        task_memory_cues (*),
        task_tags (
          tag:tags (*)
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    const tags = (data.task_tags || [])
      .map((tt: any) => tt.tag)
      .filter(Boolean);

    const mappedTask = {
      ...data,
      tags,
      memory_cues: data.task_memory_cues || [],
    } as Task;

    if (
      mappedTask.task_type === "recurring" &&
      mappedTask.status === "completed" &&
      mappedTask.due_date &&
      new Date(mappedTask.due_date) <= new Date()
    ) {
      mappedTask.status = "pending";
      if (mappedTask.subtasks) {
        mappedTask.subtasks = mappedTask.subtasks.map((st: any) => ({
          ...st,
          completed: false,
        }));
      }
      taskService.resetRecurringTask(mappedTask.id).catch((err) => {
        console.error("Failed to silently reset recurring task:", err);
      });
    }

    return mappedTask;
  },

  async createTask(
    taskData: Omit<
      Task,
      | "id"
      | "user_id"
      | "created_at"
      | "updated_at"
      | "status"
      | "completed_at"
      | "last_completed_at"
    >,
    subtasks: string[],
    memoryCues: string[],
    tagNames: string[],
  ): Promise<Task> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated");

    let dueDate = taskData.due_date;
    if (
      taskData.task_type === "recurring" &&
      taskData.recurrence_type === "weekly" &&
      taskData.recurrence_days &&
      taskData.recurrence_days.length > 0 &&
      !dueDate
    ) {
      dueDate = calculateInitialDueDate(new Date(), taskData.recurrence_days);
    }

    // 1. Insert task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: taskData.title,
        description: taskData.description,
        task_type: taskData.task_type,
        recurrence_type: taskData.recurrence_type,
        recurrence_interval: taskData.recurrence_interval,
        recurrence_days: taskData.recurrence_days,
        due_date: dueDate,
        reminder_at:
          taskData.reminder_at ||
          (taskData.task_type === "flexible"
            ? getRandomReminderTime().toISOString()
            : null),
        notes: taskData.notes,
        status: "pending",
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // 2. Insert subtasks (if any)
    const insertedSubtasks: Subtask[] = [];
    if (subtasks && subtasks.length > 0) {
      const subtaskInserts = subtasks.map((title, index) => ({
        task_id: task.id,
        title,
        completed: false,
        sort_order: index,
      }));
      const { data: subs, error: subsError } = await supabase
        .from("subtasks")
        .insert(subtaskInserts)
        .select();
      if (subsError) throw subsError;
      if (subs) insertedSubtasks.push(...subs);
    }

    // 3. Insert memory cues (if any)
    const insertedCues: MemoryCue[] = [];
    if (memoryCues && memoryCues.length > 0) {
      const cueInserts = memoryCues.map((content) => ({
        task_id: task.id,
        content,
      }));
      const { data: cues, error: cuesError } = await supabase
        .from("task_memory_cues")
        .insert(cueInserts)
        .select();
      if (cuesError) throw cuesError;
      if (cues) insertedCues.push(...cues);
    }

    // 4. Handle Tags
    const insertedTags: Tag[] = [];
    if (tagNames && tagNames.length > 0) {
      for (const name of tagNames) {
        const cleanName = name.trim().toLowerCase();
        if (!cleanName) continue;

        // Try to find or create the tag for this user
        let { data: existingTag } = await supabase
          .from("tags")
          .select()
          .eq("user_id", user.id)
          .eq("name", cleanName)
          .maybeSingle();

        if (!existingTag) {
          const { data: newTag, error: newTagError } = await supabase
            .from("tags")
            .insert({ user_id: user.id, name: cleanName })
            .select()
            .single();

          if (newTagError) throw newTagError;
          existingTag = newTag;
        }

        if (existingTag) {
          insertedTags.push(existingTag);
          // Link task and tag
          await supabase
            .from("task_tags")
            .insert({ task_id: task.id, tag_id: existingTag.id });
        }
      }
    }

    return {
      ...task,
      subtasks: insertedSubtasks,
      memory_cues: insertedCues,
      tags: insertedTags,
    };
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const payload = { ...updates };

    // Fetch current task type to handle flexible task checks
    let currentTask: Task | null = null;
    const needsTaskCheck =
      updates.status === "pending" || updates.task_type !== undefined;

    if (needsTaskCheck) {
      try {
        currentTask = await taskService.getTaskById(id);
      } catch (err) {
        console.error("Failed to fetch task for update checks:", err);
      }
    }

    const taskType = updates.task_type || currentTask?.task_type;

    if (updates.due_date !== undefined) {
      payload.due_sent = false;
    }
    if (updates.reminder_at !== undefined) {
      payload.reminder_sent = false;
    }
    if (updates.status === "pending") {
      payload.due_sent = false;
      payload.reminder_sent = false;

      // If task type is flexible, reschedule a random reminder upon resetting to pending
      if (taskType === "flexible") {
        payload.reminder_at = getRandomReminderTime().toISOString();
      }
    }

    // If task type is changed to flexible and no reminder is set, schedule one
    if (
      updates.task_type === "flexible" &&
      !updates.reminder_at &&
      !currentTask?.reminder_at
    ) {
      payload.reminder_at = getRandomReminderTime().toISOString();
      payload.reminder_sent = false;
    }

    const { error } = await supabase.from("tasks").update(payload).eq("id", id);
    if (error) throw error;
  },

  async updateTaskTags(taskId: string, tagNames: string[]): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated");

    // 1. Delete all old task_tags records for this task
    const { error: deleteError } = await supabase
      .from("task_tags")
      .delete()
      .eq("task_id", taskId);

    if (deleteError) throw deleteError;

    // 2. Resolve/create each tag and link it
    if (tagNames && tagNames.length > 0) {
      for (const name of tagNames) {
        const cleanName = name.trim().toLowerCase();
        if (!cleanName) continue;

        let { data: existingTag } = await supabase
          .from("tags")
          .select()
          .eq("user_id", user.id)
          .eq("name", cleanName)
          .maybeSingle();

        if (!existingTag) {
          const { data: newTag, error: newTagError } = await supabase
            .from("tags")
            .insert({ user_id: user.id, name: cleanName })
            .select()
            .single();

          if (newTagError) throw newTagError;
          existingTag = newTag;
        }

        if (existingTag) {
          const { error: linkError } = await supabase
            .from("task_tags")
            .insert({ task_id: taskId, tag_id: existingTag.id });
          if (linkError) throw linkError;
        }
      }
    }
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  },

  async toggleSubtask(subtaskId: string, completed: boolean): Promise<void> {
    const { error } = await supabase
      .from("subtasks")
      .update({ completed })
      .eq("id", subtaskId);
    if (error) throw error;
  },

  async addSubtask(
    taskId: string,
    title: string,
    sortOrder = 0,
  ): Promise<Subtask> {
    const { data, error } = await supabase
      .from("subtasks")
      .insert({
        task_id: taskId,
        title,
        completed: false,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSubtask(subtaskId: string): Promise<void> {
    const { error } = await supabase
      .from("subtasks")
      .delete()
      .eq("id", subtaskId);
    if (error) throw error;
  },

  async addMemoryCue(taskId: string, content: string): Promise<MemoryCue> {
    const { data, error } = await supabase
      .from("task_memory_cues")
      .insert({ task_id: taskId, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteMemoryCue(cueId: string): Promise<void> {
    const { error } = await supabase
      .from("task_memory_cues")
      .delete()
      .eq("id", cueId);
    if (error) throw error;
  },

  async completeTask(
    task: Task,
  ): Promise<{ status: "pending" | "completed"; due_date: string | null }> {
    const nowStr = new Date().toISOString();

    if (task.task_type === "recurring" && task.recurrence_type) {
      // 1. Calculate next due date
      const nextDue = calculateNextDueDate(
        task.due_date || nowStr,
        task.recurrence_type,
        task.recurrence_interval || 1,
        task.recurrence_days,
      );

      // Calculate next reminder date
      const nextReminder = task.reminder_at
        ? calculateNextDueDate(
            task.reminder_at,
            task.recurrence_type,
            task.recurrence_interval || 1,
            task.recurrence_days,
          )
        : null;

      // 2. Roll over task: update last_completed_at, update due date, set status to completed
      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          last_completed_at: nowStr,
          due_date: nextDue,
          reminder_at: nextReminder,
          reminder_sent: false,
          due_sent: false,
          status: "completed",
        })
        .eq("id", task.id);

      if (taskError) throw taskError;

      return { status: "completed", due_date: nextDue };
    } else {
      // Non-recurring task: complete normally
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: nowStr,
        })
        .eq("id", task.id);

      if (error) throw error;
      return { status: "completed", due_date: null };
    }
  },

  async resetRecurringTask(taskId: string): Promise<void> {
    // 1. Update task status to pending
    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        status: "pending",
      })
      .eq("id", taskId);

    if (taskError) throw taskError;

    // 2. Reset all subtasks for this task to completed = false
    const { error: subtasksError } = await supabase
      .from("subtasks")
      .update({ completed: false })
      .eq("task_id", taskId);

    if (subtasksError) throw subtasksError;
  },
};
