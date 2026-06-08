"use client";

import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface DashboardHeaderProps {
  activeTab: "dashboard" | "tasks" | "nudgelist";
  setActiveTab: (tab: "dashboard" | "tasks" | "nudgelist") => void;
}

export function DashboardHeader({ activeTab, setActiveTab }: DashboardHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <nav className="w-full border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3"> 
          <Link href="/" className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 select-none">
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
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Nudgelist
          </button>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-muted-foreground select-none">
            {user?.user_metadata?.name || user?.email}
          </span>
          <ThemeSwitcher />
          <button
            onClick={handleSignOut}
            className="bg-muted hover:bg-destructive/10 hover:text-destructive border border-border hover:border-destructive/30 text-muted-foreground text-xs py-1.5 px-3 rounded-lg font-semibold transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile Tab bar */}
      <div className="md:hidden border-t border-border bg-muted/30 flex justify-around py-2">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={cn(
            "text-[10px] font-semibold py-1.5 px-3 rounded-md transition-all",
            activeTab === "dashboard" ? "bg-foreground text-background font-bold" : "text-muted-foreground"
          )}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "text-[10px] font-semibold py-1.5 px-3 rounded-md transition-all",
            activeTab === "tasks" ? "bg-foreground text-background font-bold" : "text-muted-foreground"
          )}
        >
          All Tasks
        </button>
        <button
          onClick={() => setActiveTab("nudgelist")}
          className={cn(
            "text-[10px] font-semibold py-1.5 px-3 rounded-md transition-all",
            activeTab === "nudgelist" ? "bg-foreground text-background font-bold" : "text-muted-foreground"
          )}
        >
          Nudgelist
        </button>
      </div>
    </nav>
  );
}
