"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Megaphone, LogOut } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function AdminHeader() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/unauthorized";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight select-none"
          >
            <Image
              width={120}
              height={32}
              src="/images/nudger-logo-black.svg"
              alt="Nudger"
              className="dark:hidden block h-7 w-auto"
              priority
            />
            <Image
              width={120}
              height={32}
              src="/images/nudger-logo-white.svg"
              alt="Nudger"
              className="hidden dark:block h-7 w-auto"
              priority
            />
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary border border-primary/20">
              Admin
            </span>
          </Link>
          {!isAuthPage && (
            <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Megaphone className="h-4 w-4" />
                <span>Announcements</span>
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          {!isAuthPage && (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
