/**
 * Steps of the guided welcome tour. Copy follows the guide (lib/guide.ts).
 * `target` is a [data-tour] id; the tour picks whichever match is visible
 * (phone tab bar vs desktop header). `route` is the page the step lives on.
 */
export interface TourStep {
  route: string;
  /** data-tour value to highlight. Omit for a centred message. */
  target?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: "/",
    title: "Welcome to Nudger 👋",
    body: "Nudger remembers things so you don't have to. Here's a one-minute look around. You can skip any time.",
  },
  {
    route: "/",
    target: "add-task",
    title: "Add a task",
    body: "Tap here whenever something pops into your head. A title is all you need. Add a date or a repeat only if it needs one.",
  },
  {
    route: "/",
    target: "today",
    title: "Your day at a glance",
    body: "Overdue tasks come first, then today, then the next 7 days. Tasks without a date show up when there's room.",
  },
  {
    route: "/tasks",
    target: "nav-tasks",
    title: "Tasks",
    body: "Everything you've added lives here. Search, filter, tick off checklist items, or open a task to edit it.",
  },
  {
    route: "/nudgelist",
    target: "nav-nudgelist",
    title: "Nudges",
    body: "Tasks that are overdue, forgotten or going stale. The red badge shows how many need you.",
  },
  {
    route: "/settings",
    target: "nav-settings",
    title: "Settings",
    body: "Turn on notifications, set quiet hours and install Nudger to your Home Screen. Reminders are what make it work.",
  },
  {
    route: "/settings",
    target: "guide-link",
    title: "Need a refresher?",
    body: "“How Nudger works” explains everything, and you can replay this tour from there.",
  },
];
