/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import { Task, Subtask, Tag, MemoryCue } from "@/types/database.types";

const supabase = createClient();

function calculateNextDueDate(
  dueDateStr: string | null,
  type: string,
  interval: number,
): string | null {
  if (!dueDateStr) return null;
  const date = new Date(dueDateStr);
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
      return {
        ...task,
        tags,
        memory_cues: task.task_memory_cues || [],
      } as Task;
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

    return {
      ...data,
      tags,
      memory_cues: data.task_memory_cues || [],
    } as Task;
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
        due_date: taskData.due_date,
        reminder_at: taskData.reminder_at,
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
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);
    if (error) throw error;
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
      );

      // 2. Roll over task: reset subtasks, update last_completed_at, update due date, keep status pending
      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          last_completed_at: nowStr,
          due_date: nextDue,
          status: "pending",
        })
        .eq("id", task.id);

      if (taskError) throw taskError;

      // Reset subtasks
      const { error: subtasksError } = await supabase
        .from("subtasks")
        .update({ completed: false })
        .eq("task_id", task.id);

      if (subtasksError) throw subtasksError;

      return { status: "pending", due_date: nextDue };
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
};
