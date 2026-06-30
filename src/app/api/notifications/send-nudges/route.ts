import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import webpush from "web-push";

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
  const supabase = await createClient();

  // 1. Fetch tasks where reminder_at <= NOW(), status is 'pending', and reminder_sent is false
  const now = new Date().toISOString();
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "pending")
    .eq("reminder_sent", false)
    .lte("reminder_at", now);

  if (tasksError) {
    throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  }

  if (!tasks || tasks.length === 0) {
    return { sentCount: 0, message: "No pending reminders at this time." };
  }

  // 2. Fetch push subscriptions for users with pending reminders
  const userIds = Array.from(new Set(tasks.map((t) => t.user_id)));
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

  // 3. Dispatch push notifications
  for (const task of tasks) {
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
      title: "Task Nudge! ⏰",
      body: `Don't forget: ${task.title}`,
      data: {
        url: `/`, // open main dashboard
      },
    });

    for (const sub of userSubs) {
      try {
        // cast subscription structure to webpush.PushSubscription format
        await webpush.sendNotification(sub.subscription, payload);
        sentCount++;
      } catch (err: unknown) {
        console.error(`Failed to send push to subscription ID ${sub.id}:`, err);
        // If subscription is expired or revoked (410 Gone / 404 Not Found), delete it
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // 4. Mark task reminder as sent
    await supabase
      .from("tasks")
      .update({ reminder_sent: true })
      .eq("id", task.id);
  }

  return {
    sentCount,
    message: `Dispatched ${sentCount} notifications successfully.`,
  };
}

// Support GET for manual triggering/testing
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

// Support POST for cron job triggers
export async function POST() {
  try {
    const result = await processNudges();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Nudge processing failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
