import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getRandomReminderTime } from "@/lib/utils";

interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  subscription: webpush.PushSubscription;
}

// Initialize web-push VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@nudger.app",
    vapidPublicKey,
    vapidPrivateKey,
  );
}

async function processNudges() {
  // Use service role client so RLS doesn't block cron job reads
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // 0. Find and reset recurring completed tasks whose next due date has arrived
  const { data: overdueRecurring, error: recurringError } = await supabase
    .from("tasks")
    .select("id")
    .eq("task_type", "recurring")
    .eq("status", "completed")
    .lte("due_date", now);

  if (recurringError) {
    console.error("Failed to query completed recurring tasks:", recurringError);
  } else if (overdueRecurring && overdueRecurring.length > 0) {
    const ids = overdueRecurring.map((t) => t.id);

    // Reset tasks status to pending
    const { error: resetError } = await supabase
      .from("tasks")
      .update({ status: "pending" })
      .in("id", ids);

    if (resetError) {
      console.error("Failed to reset recurring task status:", resetError);
    } else {
      // Reset subtasks for these tasks
      const { error: subtasksError } = await supabase
        .from("subtasks")
        .update({ completed: false })
        .in("task_id", ids);

      if (subtasksError) {
        console.error(
          "Failed to reset recurring task subtasks:",
          subtasksError,
        );
      }
    }
  }

  // 1. Fetch tasks where reminder_at <= NOW(), status is 'pending', and reminder_sent is false
  const { data: reminderTasks, error: reminderError } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "pending")
    .eq("reminder_sent", false)
    .lte("reminder_at", now);

  if (reminderError) {
    throw new Error(`Failed to fetch reminder tasks: ${reminderError.message}`);
  }

  // 1b. Fetch tasks where due_date <= NOW(), status is 'pending', and due_sent is false
  const { data: dueTasks, error: dueError } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "pending")
    .eq("due_sent", false)
    .lte("due_date", now);

  if (dueError) {
    throw new Error(`Failed to fetch due tasks: ${dueError.message}`);
  }

  const allTasks = [...(reminderTasks || []), ...(dueTasks || [])];

  if (allTasks.length === 0) {
    return {
      sentCount: 0,
      message: "No pending reminders or due dates at this time.",
    };
  }

  // 2. Fetch push subscriptions for users with pending reminders or due dates
  const userIds = Array.from(new Set(allTasks.map((t) => t.user_id)));
  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (subsError) {
    throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
  }

  // Group subscriptions by user_id
  const subsByUser: Record<string, PushSubscriptionRecord[]> = {};
  subscriptions?.forEach((sub) => {
    if (!subsByUser[sub.user_id]) {
      subsByUser[sub.user_id] = [];
    }
    subsByUser[sub.user_id].push(sub);
  });

  let sentCount = 0;

  // 3. Dispatch push notifications for reminders
  for (const task of reminderTasks || []) {
    const userSubs = subsByUser[task.user_id] || [];
    if (userSubs.length === 0) {
      // Mark as sent anyway so we don't keep polling a user with no devices subscribed
      await supabase
        .from("tasks")
        .update({ reminder_sent: true })
        .eq("id", task.id);
      continue;
    }

    const payload = JSON.stringify({
      title: "Task Nudge!",
      body: `Don't forget: ${task.title}`,
      data: {
        url: `/`, // open main dashboard
      },
    });

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sentCount++;
      } catch (err: unknown) {
        console.error(
          `Failed to send push reminder to subscription ID ${sub.id}:`,
          err,
        );
        // If subscription is expired or revoked (410 Gone / 404 Not Found), delete it
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // Mark task reminder as sent (or reschedule if flexible)
    if (task.task_type === "flexible") {
      const nextReminder = getRandomReminderTime().toISOString();
      await supabase
        .from("tasks")
        .update({
          reminder_at: nextReminder,
          reminder_sent: false,
        })
        .eq("id", task.id);
    } else {
      await supabase
        .from("tasks")
        .update({ reminder_sent: true })
        .eq("id", task.id);
    }
  }

  // 3b. Dispatch push notifications for due dates
  for (const task of dueTasks || []) {
    const userSubs = subsByUser[task.user_id] || [];
    if (userSubs.length === 0) {
      // Mark as sent anyway so we don't keep polling a user with no devices subscribed
      await supabase.from("tasks").update({ due_sent: true }).eq("id", task.id);
      continue;
    }

    const payload = JSON.stringify({
      title: "Task Due!",
      body: `Due now: ${task.title}`,
      data: {
        url: `/`, // open main dashboard
      },
    });

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sentCount++;
      } catch (err: unknown) {
        console.error(
          `Failed to send push due alert to subscription ID ${sub.id}:`,
          err,
        );
        // If subscription is expired or revoked (410 Gone / 404 Not Found), delete it
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // Mark task due notification as sent
    await supabase.from("tasks").update({ due_sent: true }).eq("id", task.id);
  }

  return {
    sentCount,
    message: `Dispatched ${sentCount} notifications successfully.`,
  };
}

// Support GET for manual triggering/testing (no auth check — used from browser while logged in)
export async function GET() {
  try {
    const result = await processNudges();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Nudge processing failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Support POST for cron job triggers — protected by CRON_SECRET
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processNudges();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Nudge processing failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
