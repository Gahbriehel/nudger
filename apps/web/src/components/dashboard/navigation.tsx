"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BellRing,
  Home,
  ListTodo,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { useUiStore } from "@/store/uiStore";
import { countNudges, getNudgeBuckets } from "@/lib/nudges";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile tab bar (Reports is reached from Home/Settings). */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, mobile: true },
  { href: "/tasks", label: "Tasks", icon: ListTodo, mobile: true },
  { href: "/nudgelist", label: "Nudges", icon: BellRing, mobile: true },
  { href: "/reports", label: "Reports", icon: BarChart3, mobile: false },
  { href: "/settings", label: "Settings", icon: Settings, mobile: true },
];

/** Stable id for guided-tour targets, e.g. "/nudgelist" -> "nav-nudgelist". */
export const navTourId = (href: string) =>
  `nav-${href === "/" ? "home" : href.slice(1)}`;

export function isNavActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Number of tasks needing attention (same rules as the Nudgelist page). */
export function useNudgeCount(): number {
  const tasks = useTaskStore((s) => s.tasks);
  // Re-evaluate every minute so tasks become overdue without a refetch
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  return useMemo(
    () => countNudges(getNudgeBuckets(tasks)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, tick],
  );
}

/** Height of the mobile tab bar, excluding the safe-area inset. */
export const BOTTOM_NAV_HEIGHT = "4rem";

/** Phone-only bottom tab bar with a floating "new task" button. */
export function BottomNav() {
  const pathname = usePathname();
  const nudgeCount = useNudgeCount();
  const openCreateTask = useUiStore((s) => s.openCreateTask);
  const items = NAV_ITEMS.filter((i) => i.mobile);
  // Split the tabs around the central add button
  const left = items.slice(0, 2);
  const right = items.slice(2);

  const renderItem = (item: NavItem) => {
    const active = isNavActive(item.href, pathname);
    const Icon = item.icon;
    const showBadge = item.href === "/nudgelist" && nudgeCount > 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        data-tour={navTourId(item.href)}
        aria-label={
          showBadge ? `${item.label}, ${nudgeCount} need attention` : undefined
        }
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 h-full text-[11px] font-semibold transition-colors",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="relative">
          <Icon className="w-6 h-6" strokeWidth={active ? 2.4 : 1.8} />
          {showBadge && (
            <span
              className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background"
              aria-hidden="true"
            >
              {nudgeCount > 99 ? "99+" : nudgeCount}
            </span>
          )}
        </span>
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch" style={{ height: BOTTOM_NAV_HEIGHT }}>
        {left.map(renderItem)}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={openCreateTask}
            data-tour="add-task"
            aria-label="New task"
            className="w-14 h-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform ring-4 ring-background"
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}
