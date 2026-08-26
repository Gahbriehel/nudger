import { createClient } from "@/lib/supabase/server";
import {
  calculateNextDueDate,
  calculateCatchUpDueDate,
} from "@/services/task.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { taskId, mode = "single", status = "skipped" } = body;

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 },
      );
    }

    // Fetch the task belonging to the user
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 },
      );
    }

    if (task.task_type !== "recurring" || !task.recurrence_type) {
      return NextResponse.json(
        { error: "Only recurring tasks can be skipped" },
        { status: 400 },
      );
    }

    const nowStr = new Date().toISOString();
    const scheduledDate = task.due_date || nowStr;

    // Calculate next due date according to mode
    const nextDue =
      mode === "catch_up"
        ? calculateCatchUpDueDate(
            scheduledDate,
            task.recurrence_type,
            task.recurrence_interval || 1,
            task.recurrence_days,
          )
        : calculateNextDueDate(
            scheduledDate,
            task.recurrence_type,
            task.recurrence_interval || 1,
            task.recurrence_days,
          );

    const nextReminder = task.reminder_at
      ? mode === "catch_up"
        ? calculateCatchUpDueDate(
            task.reminder_at,
            task.recurrence_type,
            task.recurrence_interval || 1,
            task.recurrence_days,
          )
        : calculateNextDueDate(
            task.reminder_at,
            task.recurrence_type,
            task.recurrence_interval || 1,
            task.recurrence_days,
          )
      : null;

    // Insert log into task_occurrences
    try {
      await supabase.from("task_occurrences").insert({
        task_id: task.id,
        user_id: user.id,
        scheduled_date: scheduledDate,
        action_date: nowStr,
        status: status === "missed" ? "missed" : "skipped",
      });
    } catch (err) {
      console.error("Failed to log task_occurrence in skip route:", err);
    }

    // Update task record
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        last_skipped_at: nowStr,
        due_date: nextDue,
        reminder_at: nextReminder,
        reminder_sent: false,
        due_sent: false,
        status: "completed",
      })
      .eq("id", task.id);

    if (updateError) {
      console.error("Error skipping recurring task:", updateError);
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      taskId: task.id,
      title: task.title,
      status: "completed",
      due_date: nextDue,
      action: status,
      mode,
    });
  } catch (error: unknown) {
    console.error("Task skip API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
