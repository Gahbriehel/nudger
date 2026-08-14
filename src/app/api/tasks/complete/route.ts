import { createClient } from "@/lib/supabase/server";
import { calculateNextDueDate } from "@/services/task.service";
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
    const { taskId } = body;

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

    const nowStr = new Date().toISOString();

    if (task.task_type === "recurring" && task.recurrence_type) {
      // Calculate next due date and reminder
      const nextDue = calculateNextDueDate(
        task.due_date || nowStr,
        task.recurrence_type,
        task.recurrence_interval || 1,
        task.recurrence_days,
      );

      const nextReminder = task.reminder_at
        ? calculateNextDueDate(
            task.reminder_at,
            task.recurrence_type,
            task.recurrence_interval || 1,
            task.recurrence_days,
          )
        : null;

      const { error: updateError } = await supabase
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

      if (updateError) {
        console.error("Error completing recurring task:", updateError);
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
      });
    } else {
      // Non-recurring task: complete normally
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: nowStr,
        })
        .eq("id", task.id);

      if (updateError) {
        console.error("Error completing task:", updateError);
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
        due_date: null,
      });
    }
  } catch (error: unknown) {
    console.error("Task completion API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
