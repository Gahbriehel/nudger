"use client";

import { useAuthStore } from "@/store/authStore";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface DashboardHeaderProps {
  activeTab: "dashboard" | "tasks" | "nudgelist" | "settings";
  setActiveTab: (tab: "dashboard" | "tasks" | "nudgelist" | "settings") => void;
}

export function DashboardHeader({
  activeTab,
  setActiveTab,
}: DashboardHeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <nav className="w-full border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 select-none"
          >
            <Image
              width={150}
              height={150}
              src="/images/nudger-logo-black.svg"
              alt="Nudger"
              className="dark:hidden block"
              priority
            />
            <Image
              width={150}
              height={150}
              src="/images/nudger-logo-white.svg"
              alt="Nudger"
              className="hidden dark:block"
              priority
            />
          </Link>
        </div>

        {/* Tab Links */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
              activeTab === "dashboard"
                ? "bg-foreground text-background font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
              activeTab === "tasks"
                ? "bg-foreground text-background font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            All Tasks
          </button>
          <button
            onClick={() => setActiveTab("nudgelist")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
              activeTab === "nudgelist"
                ? "bg-foreground text-background font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            Nudgelist
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
              activeTab === "settings"
                ? "bg-foreground text-background font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            Settings
          </button>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex flex-col items-end justify-center select-none">
              <span className="text-sm font-semibold text-foreground leading-tight">
                {user?.user_metadata?.name || "User"}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Signed In
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm select-none">
              {user?.user_metadata?.name?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() ||
                "U"}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab bar */}
      <div className="md:hidden border-t border-border bg-muted/30 flex justify-around py-2">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={cn(
            "text-[10px] font-semibold py-1.5 px-3 rounded-md transition-all",
            activeTab === "dashboard"
              ? "bg-foreground text-background font-bold"
              : "text-muted-foreground",
          )}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "text-[10px] font-semibold py-1.5 px-3 rounded-md transition-all",
            activeTab === "tasks"
              ? "bg-foreground text-background font-bold"
              : "text-muted-foreground",
          )}
        >
          All Tasks
        </button>
        <button
          onClick={() => setActiveTab("nudgelist")}
          className={cn(
            "text-[10px] font-semibold py-1.5 px-3 rounded-md transition-all",
            activeTab === "nudgelist"
              ? "bg-foreground text-background font-bold"
              : "text-muted-foreground",
          )}
        >
          Nudgelist
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "text-[10px] font-semibold py-1.5 px-3 rounded-md transition-all",
            activeTab === "settings"
              ? "bg-foreground text-background font-bold"
              : "text-muted-foreground",
          )}
        >
          Settings
        </button>
      </div>
    </nav>
  );
}
