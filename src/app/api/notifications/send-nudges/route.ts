import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getRandomReminderTime } from "@/lib/utils";

interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  subscription: webpush.PushSubscription;
}

interface UserSettingsRecord {
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

function isQuietHours(
  settings: UserSettingsRecord,
  nowDate: Date = new Date(),
): boolean {
  if (!settings.quiet_hours_enabled) return false;

  const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

  const [startH, startM] = (settings.quiet_hours_start || "22:00")
    .split(":")
    .map(Number);
  const [endH, endM] = (settings.quiet_hours_end || "07:00")
    .split(":")
    .map(Number);

  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

async function processReportDigests(
  supabase: ReturnType<typeof createAdminClient>,
  nowDate: Date = new Date(),
): Promise<number> {
  const isSundayEvening = nowDate.getDay() === 0 && nowDate.getHours() >= 19;
  const isFirstOfMonthMorning =
    nowDate.getDate() === 1 && nowDate.getHours() >= 9;

  if (!isSundayEvening && !isFirstOfMonthMorning) {
    return 0;
  }

  const todayStr = nowDate.toISOString().split("T")[0];

  // Fetch all push subscriptions
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (subsError || !subs || subs.length === 0) {
    return 0;
  }

  // Group by user_id
  const subsByUser: Record<string, PushSubscriptionRecord[]> = {};
  subs.forEach((sub: PushSubscriptionRecord) => {
    if (!subsByUser[sub.user_id]) {
      subsByUser[sub.user_id] = [];
    }
    subsByUser[sub.user_id].push(sub);
  });

  const userIds = Object.keys(subsByUser);
  const { data: settingsList } = await supabase
    .from("user_settings")
    .select("*")
    .in("user_id", userIds);

  const settingsMap: Record<string, UserSettingsRecord> = {};
  settingsList?.forEach((s: UserSettingsRecord) => {
    settingsMap[s.user_id] = s;
  });

  let reportSentCount = 0;

  for (const userId of userIds) {
    const settings = settingsMap[userId];
    if (settings && isQuietHours(settings, nowDate)) {
      continue;
    }

    const userSubs = subsByUser[userId] || [];
    if (userSubs.length === 0) continue;

    if (
      isSundayEvening &&
      (!settings || settings.enable_weekly_report !== false) &&
      settings?.last_weekly_report_date !== todayStr
    ) {
      const payload = JSON.stringify({
        title: "Weekly Performance Digest 📊",
        body: "Your weekly productivity review is ready! See your completion rate and habit consistency score.",
        data: { url: "/reports?period=weekly" },
      });

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          reportSentCount++;
        } catch (err: unknown) {
          console.error(`Failed to send weekly report push to ${sub.id}:`, err);
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }

      await supabase.from("user_settings").upsert(
        {
          user_id: userId,
          last_weekly_report_date: todayStr,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } else if (
      isFirstOfMonthMorning &&
      (!settings || settings.enable_monthly_report !== false) &&
      settings?.last_monthly_report_date !== todayStr
    ) {
      const payload = JSON.stringify({
        title: "Monthly Productivity Review 🗓️",
        body: "Your monthly summary is ready. Review your milestone accomplishments and cue impact.",
        data: { url: "/reports?period=monthly" },
      });

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          reportSentCount++;
        } catch (err: unknown) {
          console.error(
            `Failed to send monthly report push to ${sub.id}:`,
            err,
          );
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }

      await supabase.from("user_settings").upsert(
        {
          user_id: userId,
          last_monthly_report_date: todayStr,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  }

  return reportSentCount;
}

async function processNudges() {
  // Use service role client so RLS doesn't block cron job reads
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const todayStr = new Date().toISOString().split("T")[0];

  // 0. Find and reset recurring completed tasks that are within the lead-up window
  const resetCutoff = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const { data: overdueRecurring, error: recurringError } = await supabase
    .from("tasks")
    .select("id")
    .eq("task_type", "recurring")
    .eq("status", "completed")
    .lte("due_date", resetCutoff);

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
    .select("*, subtasks(*)")
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

  // 1c. Fetch idle users
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  const { data: idleActivity, error: idleError } = await supabase
    .from("user_activity")
    .select("user_id")
    .lt("last_active_at", eightHoursAgo)
    .or(`last_idle_nudge_at.is.null,last_idle_nudge_at.lt.${eightHoursAgo}`);

  if (idleError) {
    console.error("Failed to query idle activity:", idleError);
  }

  const potentialIdleUserIds = idleActivity?.map((a) => a.user_id) || [];

  // Filter out users who have pending tasks
  let idleUserIdsToNudge: string[] = [];
  if (potentialIdleUserIds.length > 0) {
    const { data: activeTasks } = await supabase
      .from("tasks")
      .select("user_id")
      .in("user_id", potentialIdleUserIds)
      .eq("status", "pending");

    const usersWithPendingTasks = new Set(
      activeTasks?.map((t) => t.user_id) || [],
    );
    idleUserIdsToNudge = potentialIdleUserIds.filter(
      (id) => !usersWithPendingTasks.has(id),
    );
  }

  const taskUserIds = Array.from(new Set(allTasks.map((t) => t.user_id)));
  const allUserIds = Array.from(
    new Set([...taskUserIds, ...idleUserIdsToNudge]),
  );

  if (allUserIds.length === 0) {
    const reportSent = await processReportDigests(supabase);
    return {
      sentCount: reportSent,
      message:
        reportSent > 0
          ? `Dispatched ${reportSent} report digest notifications successfully.`
          : "No pending reminders, due dates, idle nudges, or report digests at this time.",
    };
  }

  // 2. Fetch push subscriptions and user settings
  const [subsResult, settingsResult] = await Promise.all([
    supabase.from("push_subscriptions").select("*").in("user_id", allUserIds),
    supabase.from("user_settings").select("*").in("user_id", allUserIds),
  ]);

  if (subsResult.error) {
    throw new Error(
      `Failed to fetch subscriptions: ${subsResult.error.message}`,
    );
  }

  // Group subscriptions by user_id
  const subsByUser: Record<string, PushSubscriptionRecord[]> = {};
  subsResult.data?.forEach((sub) => {
    if (!subsByUser[sub.user_id]) {
      subsByUser[sub.user_id] = [];
    }
    subsByUser[sub.user_id].push(sub);
  });

  // Group user settings by user_id
  const userSettingsMap: Record<string, UserSettingsRecord> = {};
  settingsResult.data?.forEach((setting) => {
    userSettingsMap[setting.user_id] = setting;
  });

  // Helper to resolve settings with defaults and handle daily counter resets
  const getUserSettings = (userId: string): UserSettingsRecord => {
    const existing = userSettingsMap[userId];
    const defaultSettings: UserSettingsRecord = {
      user_id: userId,
      max_flexible_nudges_per_day: 2,
      enable_idle_nudges: true,
      enable_subtask_nudges: true,
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "07:00",
      flexible_nudges_count_today: 0,
      last_nudge_date: todayStr,
    };

    if (!existing) {
      return defaultSettings;
    }

    // Reset daily count if date has changed
    if (existing.last_nudge_date !== todayStr) {
      existing.flexible_nudges_count_today = 0;
      existing.last_nudge_date = todayStr;
    }

    return existing;
  };

  let sentCount = 0;

  // 3. Dispatch DUE DATE notifications (TIER 1 - GUARANTEED & CONSOLIDATED)
  // Group due tasks by user_id
  const dueTasksByUser: Record<string, typeof dueTasks> = {};
  dueTasks?.forEach((task) => {
    if (!dueTasksByUser[task.user_id]) {
      dueTasksByUser[task.user_id] = [];
    }
    dueTasksByUser[task.user_id]!.push(task);
  });

  for (const [userId, tasksGroup] of Object.entries(dueTasksByUser)) {
    if (!tasksGroup || tasksGroup.length === 0) continue;
    const userSubs = subsByUser[userId] || [];
    const taskIds = tasksGroup.map((t) => t.id);

    if (userSubs.length === 0) {
      // Mark as sent anyway so we don't keep polling users with no active subscriptions
      await supabase.from("tasks").update({ due_sent: true }).in("id", taskIds);
      continue;
    }

    let payloadString: string;

    if (tasksGroup.length === 1) {
      const task = tasksGroup[0];
      const dueTemplates = [
        `Due now: {task}`,
        `Time's up for: {task}`,
        `"{task}" is due!`,
      ];
      const randomDueTemplate =
        dueTemplates[Math.floor(Math.random() * dueTemplates.length)];
      const pushBody = randomDueTemplate.replace("{task}", task.title);

      payloadString = JSON.stringify({
        title: "Task Due!",
        body: pushBody,
        data: {
          url: `/tasks/${task.id}`,
          taskId: task.id,
          type: "due",
        },
      });
    } else {
      // Consolidated Multi-Task Due Nudge
      const firstTitle = tasksGroup[0].title;
      const secondTitle = tasksGroup[1].title;
      const extraCount = tasksGroup.length - 2;

      let bodyText = `Due now: "${firstTitle}", "${secondTitle}"`;
      if (extraCount > 0) {
        bodyText += ` and ${extraCount} more task${extraCount > 1 ? "s" : ""}`;
      }

      payloadString = JSON.stringify({
        title: `${tasksGroup.length} Tasks Due Now! ⏰`,
        body: bodyText,
        data: {
          url: `/`,
          type: "due_consolidated",
        },
      });
    }

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(sub.subscription, payloadString);
        sentCount++;
      } catch (err: unknown) {
        console.error(
          `Failed to send due push alert to subscription ID ${sub.id}:`,
          err,
        );
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // Mark all tasks in this group as due_sent = true
    await supabase.from("tasks").update({ due_sent: true }).in("id", taskIds);
  }

  // 4. Dispatch REMINDER notifications (TIER 2 - MANAGED & THROTTLED for Flexible, GUARANTEED for Scheduled/Recurring)
  for (const task of reminderTasks || []) {
    const settings = getUserSettings(task.user_id);
    const userSubs = subsByUser[task.user_id] || [];

    if (userSubs.length === 0) {
      await supabase
        .from("tasks")
        .update({ reminder_sent: true })
        .eq("id", task.id);
      continue;
    }

    const isFlexible = task.task_type === "flexible";

    if (isFlexible) {
      // Check Quiet Hours or Daily Nudge Cap
      const inQuietHours = isQuietHours(settings);
      const capReached =
        settings.flexible_nudges_count_today >=
        settings.max_flexible_nudges_per_day;

      if (inQuietHours || capReached) {
        // Reschedule flexible task for a later time without firing push notification
        const nextReminder = getRandomReminderTime().toISOString();
        await supabase
          .from("tasks")
          .update({ reminder_at: nextReminder, reminder_sent: false })
          .eq("id", task.id);
        continue;
      }
    }

    // Build Payload
    const pendingSubtasks =
      (
        task.subtasks as { id: string; title: string; completed: boolean }[]
      )?.filter((s) => !s.completed) || [];

    const taskTemplates = [
      `Don't forget: {task}`,
      `Friendly reminder: {task}`,
      `Time to work on: {task}`,
      `Have you started on "{task}" yet?`,
    ];
    const checklistTemplates = [
      `What do you think about checking off "{subtask}" in "{task}"?`,
      `Knock out "{subtask}" to make progress on "{task}"!`,
      `Ready to tackle "{subtask}" for "{task}"?`,
      `"{task}" is waiting! How about starting with "{subtask}"?`,
    ];

    let pushTitle = "Task Nudge!";
    const randomTaskTemplate =
      taskTemplates[Math.floor(Math.random() * taskTemplates.length)];
    let pushBody = randomTaskTemplate.replace("{task}", task.title);

    if (pendingSubtasks.length > 0 && settings.enable_subtask_nudges) {
      const randomSubtask =
        pendingSubtasks[Math.floor(Math.random() * pendingSubtasks.length)];
      pushTitle = "Checklist Nudge 📝";
      const randomChecklistTemplate =
        checklistTemplates[
          Math.floor(Math.random() * checklistTemplates.length)
        ];
      pushBody = randomChecklistTemplate
        .replace("{subtask}", randomSubtask.title)
        .replace("{task}", task.title);
    }

    const payload = JSON.stringify({
      title: pushTitle,
      body: pushBody,
      data: {
        url: `/tasks/${task.id}`,
        taskId: task.id,
        type: "reminder",
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
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    if (isFlexible) {
      // Increment flexible nudge count and update settings
      settings.flexible_nudges_count_today += 1;
      settings.last_nudge_date = todayStr;

      await supabase.from("user_settings").upsert(
        {
          user_id: task.user_id,
          flexible_nudges_count_today: settings.flexible_nudges_count_today,
          last_nudge_date: todayStr,
        },
        { onConflict: "user_id" },
      );

      const nextReminder = getRandomReminderTime().toISOString();
      await supabase
        .from("tasks")
        .update({ reminder_at: nextReminder, reminder_sent: false })
        .eq("id", task.id);
    } else {
      await supabase
        .from("tasks")
        .update({ reminder_sent: true })
        .eq("id", task.id);
    }
  }

  // 5. Dispatch IDLE NUDGES (respect settings & Quiet Hours)
  const idleMessages = [
    "Your task list is empty! Time to add something new?",
    "Nothing on your plate? Add a task to keep the momentum going!",
    "All caught up? Plan your next move.",
    "Nudger is resting. Give it some work to do!",
    "You're all clear! Ready to tackle a new goal?",
  ];

  for (const userId of idleUserIdsToNudge) {
    const settings = getUserSettings(userId);
    if (!settings.enable_idle_nudges || isQuietHours(settings)) continue;

    const userSubs = subsByUser[userId] || [];
    if (userSubs.length === 0) continue;

    const randomMessage =
      idleMessages[Math.floor(Math.random() * idleMessages.length)];
    const payload = JSON.stringify({
      title: "Quiet day? 👋",
      body: randomMessage,
      data: { url: `/` },
    });

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sentCount++;
      } catch (err: unknown) {
        console.error(
          `Failed to send push idle nudge to subscription ID ${sub.id}:`,
          err,
        );
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // Update last_idle_nudge_at
    await supabase
      .from("user_activity")
      .update({ last_idle_nudge_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  const reportSent = await processReportDigests(supabase);
  sentCount += reportSent;

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
