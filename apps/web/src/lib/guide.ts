import {
  BarChart3,
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Download,
  Lightbulb,
  ListChecks,
  Plus,
  type LucideIcon,
} from "lucide-react";

export interface GuideSection {
  /** Anchor id, e.g. /guide#nudges. Stable: empty states link to these. */
  id: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  points: string[];
  /** Where to try it out. */
  link?: { href: string; label: string };
}

/** The first things a new user should do, in order. */
export const QUICK_START: { title: string; body: string }[] = [
  {
    title: "Add something you don't want to keep in your head",
    body: "Tap the + button (or “New task” on Home). A title is all you need.",
  },
  {
    title: "Give it a time only if it needs one",
    body: "No date means Nudger checks in with you now and then. Add a due date or a repeat and it becomes scheduled or recurring.",
  },
  {
    title: "Let Nudger do the remembering",
    body: "Turn on notifications in Settings, then check Home each day and the Nudges tab when something is slipping.",
  },
];

/**
 * Single source of truth for the help content. The guide page renders it
 * now; a future guided tour can reuse the same copy.
 */
export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "adding-tasks",
    title: "Adding a task",
    icon: Plus,
    summary:
      "Only a title is required. Everything else is there when you want it.",
    points: [
      "Phone: tap the round + button in the middle of the tab bar. Computer: use “New task”.",
      "Due date is when it must be done. Reminder is when Nudger should ping you, which can be earlier.",
      "Tags let you group and filter tasks, for example Work or Health.",
      "Notes hold extra detail. Subtasks and Memory cues are covered below.",
      "Tap a task any time to open it and change anything.",
    ],
    link: { href: "/tasks", label: "Open Tasks" },
  },
  {
    id: "task-types",
    title: "Flexible, scheduled and recurring",
    icon: CalendarClock,
    summary:
      "Nudger works out the type from what you fill in. You can always pick one yourself.",
    points: [
      "Flexible: no deadline. Nudger checks in now and then so it doesn't get forgotten.",
      "Scheduled: has a due date and/or a reminder.",
      "Recurring: repeats on a schedule, such as every 2 days or on chosen weekdays.",
      "In the editor, “Auto” shows the type Nudger picked. Tap another chip to override it.",
    ],
  },
  {
    id: "task-actions",
    title: "Done, snooze, skip and pause",
    icon: CheckCircle2,
    summary: "Four ways to deal with a task, each with a different meaning.",
    points: [
      "Complete: counts toward your reports. A recurring task moves on to its next date.",
      "Snooze: postpone to a later time. Snoozing a task with no date gives it one. For a recurring task you choose this occurrence only or the whole series.",
      "Skip or missed (recurring only): move to the next occurrence. It is logged as skipped or missed and does not count as completed.",
      "Pause (recurring): no reminders, nothing goes overdue, and nothing is logged as missed until you resume.",
    ],
  },
  {
    id: "checklists",
    title: "Subtasks and checklists",
    icon: ListChecks,
    summary: "Break a task into steps and tick them off as you go.",
    points: [
      "Add checklist items when you create a task, or later from the task page.",
      "Tick items right from the task list without opening the task.",
      "Open items are shown first, and ticked ones are tucked away.",
      "Checklist nudges (optional, in Settings) remind you about half-finished lists.",
    ],
  },
  {
    id: "memory-cues",
    title: "Memory cues",
    icon: Lightbulb,
    summary: "A cue is something in your surroundings that prompts you.",
    points: [
      "Example: “Place the server logs spreadsheet on the second monitor”.",
      "Add them in the Memory cues field when creating a task.",
      "Reports compare how often you finish tasks with and without cues, so you can see whether they work for you.",
    ],
  },
  {
    id: "nudges",
    title: "The Nudges tab",
    icon: BellRing,
    summary: "A short list of tasks that need your attention right now.",
    points: [
      "Overdue: past their due date. Finish them or snooze to a better time.",
      "Forgotten: untouched for over a week. Still relevant? If not, delete it.",
      "Going stale: untouched for 3 to 7 days.",
      "The red badge on the Nudges tab shows how many tasks are waiting.",
      "Paused and completed tasks never appear here.",
    ],
    link: { href: "/nudgelist", label: "Open Nudges" },
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    summary: "Reminders reach you even when the app is closed.",
    points: [
      "Turn them on in Settings. Your browser or phone will ask for permission.",
      "iPhone: install Nudger to your Home Screen first, since iOS only allows notifications for installed apps.",
      "Max daily flexible nudges caps how often tasks without a date nag you.",
      "Quiet hours pause flexible reminders and idle nudges overnight (for example 22:00 to 07:00).",
    ],
    link: { href: "/settings", label: "Open Settings" },
  },
  {
    id: "reports",
    title: "Reports",
    icon: BarChart3,
    summary: "See what you got done, weekly or monthly.",
    points: [
      "Switch between weekly and monthly, and step back through earlier periods.",
      "Charts show your busiest days, which tags you finish most, and the effect of memory cues.",
      "Reports fill in as you complete tasks, so they are empty at first.",
      "You can export a report. On a phone, Reports is reached from Settings.",
    ],
    link: { href: "/reports", label: "Open Reports" },
  },
  {
    id: "install-offline",
    title: "Install and offline use",
    icon: Download,
    summary: "Nudger works best installed on your Home Screen.",
    points: [
      "Install from the Nudger App card in Settings. It then opens like a normal app.",
      "Offline you can read your tasks, but you can't add or change them. Reconnect to edit.",
    ],
  },
];
