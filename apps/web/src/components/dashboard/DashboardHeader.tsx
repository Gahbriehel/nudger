"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive, useNudgeCount } from "./navigation";

export function DashboardHeader() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const nudgeCount = useNudgeCount();
  const displayName =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "";

  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center select-none"
          aria-label="Nudger home"
        >
          <Image
            width={120}
            height={32}
            src="/images/nudger-logo-black.svg"
            alt="Nudger"
            className="dark:hidden block h-auto w-[110px] md:w-[130px]"
            priority
          />
          <Image
            width={120}
            height={32}
            src="/images/nudger-logo-white.svg"
            alt="Nudger"
            className="hidden dark:block h-auto w-[110px] md:w-[130px]"
            priority
          />
        </Link>

        {/* Desktop navigation (phones use the bottom tab bar) */}
        <nav aria-label="Main" className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {item.label}
                {item.href === "/nudgelist" && nudgeCount > 0 && (
                  <span className="ml-1.5 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold">
                    {nudgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          {displayName && (
            <Link
              href="/settings"
              aria-label="Account settings"
              className="hidden md:flex w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center text-primary font-bold text-sm select-none"
              title={displayName}
            >
              {displayName.charAt(0).toUpperCase()}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
