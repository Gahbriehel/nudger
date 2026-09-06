import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  ReportData,
  ReportPeriod,
  ReportTimeframe,
  DailyActivityPoint,
  ReportTagSummary,
  ReportTaskTypeSummary,
  CompletedReportItem,
  Task,
  Tag,
  MemoryCue,
  TaskOccurrence,
} from "@/types/database.types";
import { format } from "@/lib/date-fns";

const supabase = createClient();

interface TaskQueryResult extends Task {
  task_tags?: Array<{ tag: Tag | null }>;
  task_memory_cues?: MemoryCue[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Get week number of the year for a given date
 */
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Calculates start and end Date for a week (Monday 00:00:00 to Sunday 23:59:59)
 * with offset (0 = current week, -1 = previous week, +1 = next week)
 */
export function calculateWeeklyTimeframe(offset = 0): ReportTimeframe {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  targetDate.setDate(targetDate.getDate() + offset * 7);

  const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekNum = getWeekNumber(monday);

  let subLabel = `Week ${weekNum}`;
  if (offset === 0) subLabel = "This Week";
  else if (offset === -1) subLabel = "Last Week";
  else if (offset === 1) subLabel = "Next Week";

  const label = `${format(monday, "MMM d")} – ${format(sunday, "MMM d, yyyy")}`;

  return {
    period: "weekly",
    startDate: monday.toISOString(),
    endDate: sunday.toISOString(),
    label,
    subLabel,
    offset,
  };
}

/**
 * Calculates start and end Date for a month (1st 00:00:00 to Last Day 23:59:59)
 * with offset (0 = current month, -1 = previous month, +1 = next month)
 */
export function calculateMonthlyTimeframe(offset = 0): ReportTimeframe {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;

  const firstDay = new Date(year, month, 1, 0, 0, 0, 0);
  const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  let subLabel = `${MONTH_NAMES[firstDay.getMonth()]} Review`;
  if (offset === 0) subLabel = "This Month";
  else if (offset === -1) subLabel = "Last Month";

  const label = `${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getFullYear()}`;

  return {
    period: "monthly",
    startDate: firstDay.toISOString(),
    endDate: lastDay.toISOString(),
    label,
    subLabel,
    offset,
  };
}

export const reportService = {
  /**
   * Fetch complete aggregated report data for a given period and offset
   */
  async getReportData(
    period: ReportPeriod = "weekly",
    offset = 0,
    customClient?: SupabaseClient,
  ): Promise<ReportData> {
    const db = customClient || supabase;
    const timeframe =
      period === "weekly"
        ? calculateWeeklyTimeframe(offset)
        : calculateMonthlyTimeframe(offset);

    // Calculate previous period for comparison/trend delta
    const previousTimeframe =
      period === "weekly"
        ? calculateWeeklyTimeframe(offset - 1)
        : calculateMonthlyTimeframe(offset - 1);

    const {
      data: { user },
    } = await db.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // 1. Fetch user tasks with subtasks, tags, memory_cues
    const { data: allTasks, error: tasksError } = await db
      .from("tasks")
      .select(
        `
        *,
        subtasks (*),
        task_tags (
          tag:tags (*)
        ),
        task_memory_cues (*)
      `,
      )
      .eq("user_id", user.id);

    if (tasksError) {
      console.error("Error fetching tasks for report:", tasksError);
      throw tasksError;
    }

    // Map tasks to normalize joined fields
    const tasks: Task[] = (
      (allTasks as unknown as TaskQueryResult[]) || []
    ).map((t) => ({
      ...t,
      tags:
        t.task_tags
          ?.map((tt) => tt.tag)
          .filter((tag): tag is Tag => tag !== null) || [],
      memory_cues: t.task_memory_cues || [],
    }));

    const taskMap = new Map<string, Task>();
    tasks.forEach((t) => taskMap.set(t.id, t));

    // 2. Fetch task_occurrences for current period
    const { data: occurrences, error: occError } = await db
      .from("task_occurrences")
      .select("*")
      .eq("user_id", user.id)
      .gte("action_date", timeframe.startDate)
      .lte("action_date", timeframe.endDate);

    if (occError) {
      console.error("Error fetching occurrences for report:", occError);
    }

    const currentOccurrences: TaskOccurrence[] = occurrences || [];

    // 3. Fetch occurrences for previous period (for delta comparison)
    const { data: prevOccurrences } = await db
      .from("task_occurrences")
      .select("*")
      .eq("user_id", user.id)
      .gte("action_date", previousTimeframe.startDate)
      .lte("action_date", previousTimeframe.endDate);

    const prevList: TaskOccurrence[] = prevOccurrences || [];

    // 4. Build completed items list
    // A completed item can come from task_occurrences (status = 'completed')
    // OR directly from tasks completed_at or last_completed_at within timeframe
    const completedItemsMap = new Map<string, CompletedReportItem>();

    // Process from task_occurrences
    currentOccurrences
      .filter((o) => o.status === "completed")
      .forEach((o) => {
        const task = taskMap.get(o.task_id);
        const subtasks = task?.subtasks || [];
        const completedSubtasks = subtasks.filter((s) => s.completed).length;

        completedItemsMap.set(o.id, {
          id: o.id,
          taskId: o.task_id,
          title: task?.title || "Completed Task",
          taskType: task?.task_type || "scheduled",
          completedAt: o.action_date,
          hasMemoryCue: (task?.memory_cues?.length || 0) > 0,
          cueContent: task?.memory_cues?.[0]?.content,
          tags: (task?.tags || []).map((tag) => tag.name),
          subtasksCompleted: completedSubtasks,
          subtasksTotal: subtasks.length,
        });
      });

    // Also include one-off or tasks whose completed_at or last_completed_at falls in timeframe
    const startMs = new Date(timeframe.startDate).getTime();
    const endMs = new Date(timeframe.endDate).getTime();

    tasks.forEach((task) => {
      const compDate = task.completed_at || task.last_completed_at;
      if (compDate) {
        const compTime = new Date(compDate).getTime();
        if (compTime >= startMs && compTime <= endMs) {
          // Check if already captured via occurrence
          const alreadyExists = Array.from(completedItemsMap.values()).some(
            (item) => item.taskId === task.id,
          );

          if (!alreadyExists) {
            const subtasks = task.subtasks || [];
            const completedSubtasks = subtasks.filter(
              (s) => s.completed,
            ).length;

            completedItemsMap.set(`task-${task.id}`, {
              id: `task-${task.id}`,
              taskId: task.id,
              title: task.title,
              taskType: task.task_type,
              completedAt: compDate,
              hasMemoryCue: (task.memory_cues?.length || 0) > 0,
              cueContent: task.memory_cues?.[0]?.content,
              tags: (task.tags || []).map((t) => t.name),
              subtasksCompleted: completedSubtasks,
              subtasksTotal: subtasks.length,
            });
          }
        }
      }
    });

    const completedItems = Array.from(completedItemsMap.values()).sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );

    // 5. Calculate skipped count
    const totalSkipped = currentOccurrences.filter(
      (o) => o.status === "skipped",
    ).length;

    // 6. Calculate total scheduled in timeframe
    // Scheduled tasks whose due_date falls in the window + recurring occurrences
    const scheduledInWindow = tasks.filter((t) => {
      if (!t.due_date) return false;
      const dueTime = new Date(t.due_date).getTime();
      return dueTime >= startMs && dueTime <= endMs;
    }).length;

    const totalCompleted = completedItems.length;
    const totalActions = totalCompleted + totalSkipped;
    const totalScheduled = Math.max(totalActions, scheduledInWindow);

    // Completion Rate %
    const completionRate =
      totalScheduled > 0
        ? Math.min(100, Math.round((totalCompleted / totalScheduled) * 100))
        : 0;

    // Previous Period Completion Rate for Delta
    const prevCompletedCount = prevList.filter(
      (o: TaskOccurrence) => o.status === "completed",
    ).length;
    const prevSkippedCount = prevList.filter(
      (o: TaskOccurrence) => o.status === "skipped",
    ).length;
    const prevTotal = prevCompletedCount + prevSkippedCount;
    const prevCompletionRate =
      prevTotal > 0
        ? Math.min(100, Math.round((prevCompletedCount / prevTotal) * 100))
        : null;

    const completionRateDelta =
      prevCompletionRate !== null ? completionRate - prevCompletionRate : null;

    // 7. Subtasks completed count
    const totalSubtasksCompleted = completedItems.reduce(
      (acc, item) => acc + item.subtasksCompleted,
      0,
    );

    // 8. Recurring Adherence Rate
    const recurringOccurrences = currentOccurrences.filter((o) => {
      const task = taskMap.get(o.task_id);
      return task?.task_type === "recurring";
    });
    const recurringCompleted = recurringOccurrences.filter(
      (o) => o.status === "completed",
    ).length;
    const recurringTotal = recurringOccurrences.length;
    const recurringAdherenceRate =
      recurringTotal > 0
        ? Math.round((recurringCompleted / recurringTotal) * 100)
        : totalCompleted > 0
          ? 100
          : 0;

    // 9. Cognitive Cue Impact
    // Compare completion rate for tasks with memory cues vs tasks without
    const cueTasks = tasks.filter((t) => (t.memory_cues?.length || 0) > 0);
    const nonCueTasks = tasks.filter((t) => (t.memory_cues?.length || 0) === 0);

    const completedCueTasksCount = completedItems.filter(
      (item) => item.hasMemoryCue,
    ).length;
    const completedNonCueTasksCount = completedItems.filter(
      (item) => !item.hasMemoryCue,
    ).length;

    const cueCompletionRate =
      cueTasks.length > 0
        ? Math.min(
            100,
            Math.round((completedCueTasksCount / cueTasks.length) * 100),
          )
        : completedCueTasksCount > 0
          ? 100
          : 0;

    const nonCueCompletionRate =
      nonCueTasks.length > 0
        ? Math.min(
            100,
            Math.round((completedNonCueTasksCount / nonCueTasks.length) * 100),
          )
        : completedNonCueTasksCount > 0
          ? 100
          : 0;

    const cueImpactDelta = cueCompletionRate - nonCueCompletionRate;

    // 10. Generate Daily Activity Points
    const dailyActivity: DailyActivityPoint[] = [];
    const startDate = new Date(timeframe.startDate);
    const endDate = new Date(timeframe.endDate);
    const dayCursor = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );

    const dayCompletionsMap = new Map<string, number>();
    const daySkippedMap = new Map<string, number>();

    completedItems.forEach((item) => {
      const dayKey = format(new Date(item.completedAt), "yyyy-MM-dd");
      dayCompletionsMap.set(dayKey, (dayCompletionsMap.get(dayKey) || 0) + 1);
    });

    currentOccurrences
      .filter((o) => o.status === "skipped")
      .forEach((o) => {
        const dayKey = format(new Date(o.action_date), "yyyy-MM-dd");
        daySkippedMap.set(dayKey, (daySkippedMap.get(dayKey) || 0) + 1);
      });

    while (dayCursor <= endDate) {
      const dateKey = format(dayCursor, "yyyy-MM-dd");
      const dayIndex = dayCursor.getDay();
      const completedCount = dayCompletionsMap.get(dateKey) || 0;
      const skippedCount = daySkippedMap.get(dateKey) || 0;

      dailyActivity.push({
        date: dateKey,
        dayLabel: SHORT_DAY_NAMES[dayIndex],
        fullDateLabel: format(dayCursor, "MMM d, yyyy"),
        completedCount,
        skippedCount,
        totalActionCount: completedCount + skippedCount,
      });

      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    // 11. Most Productive Day
    let maxCompletions = -1;
    let mostProductiveDay: string | null = null;
    dailyActivity.forEach((point) => {
      if (point.completedCount > maxCompletions && point.completedCount > 0) {
        maxCompletions = point.completedCount;
        const d = new Date(point.date + "T00:00:00");
        mostProductiveDay = DAY_NAMES[d.getDay()];
      }
    });

    // 12. Active Streak within period
    let streak = 0;
    let currentStreak = 0;
    dailyActivity.forEach((point) => {
      if (point.completedCount > 0) {
        currentStreak++;
        if (currentStreak > streak) streak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    // 13. Task Type Breakdown
    const typeCounts: Record<string, number> = {
      flexible: 0,
      scheduled: 0,
      recurring: 0,
    };
    completedItems.forEach((item) => {
      if (typeCounts[item.taskType] !== undefined) {
        typeCounts[item.taskType]++;
      } else {
        typeCounts.scheduled++;
      }
    });

    const taskTypeBreakdown: ReportTaskTypeSummary[] = [
      {
        type: "flexible",
        label: "Flexible Tasks",
        completed: typeCounts.flexible,
        percentage:
          totalCompleted > 0
            ? Math.round((typeCounts.flexible / totalCompleted) * 100)
            : 0,
      },
      {
        type: "scheduled",
        label: "Scheduled Tasks",
        completed: typeCounts.scheduled,
        percentage:
          totalCompleted > 0
            ? Math.round((typeCounts.scheduled / totalCompleted) * 100)
            : 0,
      },
      {
        type: "recurring",
        label: "Recurring Tasks",
        completed: typeCounts.recurring,
        percentage:
          totalCompleted > 0
            ? Math.round((typeCounts.recurring / totalCompleted) * 100)
            : 0,
      },
    ];

    // 14. Top Tags Breakdown
    const tagCounts: Record<string, number> = {};
    completedItems.forEach((item) => {
      item.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const totalTagUsage = Object.values(tagCounts).reduce((a, b) => a + b, 0);

    const topTags: ReportTagSummary[] = Object.entries(tagCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalTagUsage > 0 ? Math.round((count / totalTagUsage) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      timeframe,
      metrics: {
        totalCompleted,
        totalScheduled,
        totalSkipped,
        completionRate,
        completionRateDelta,
        totalSubtasksCompleted,
        recurringAdherenceRate,
        cueCompletionRate,
        nonCueCompletionRate,
        cueImpactDelta,
        tasksWithCuesCount: completedCueTasksCount,
        tasksWithoutCuesCount: completedNonCueTasksCount,
        mostProductiveDay,
        streakDays: streak,
      },
      dailyActivity,
      taskTypeBreakdown,
      topTags,
      completedItems,
    };
  },
};
