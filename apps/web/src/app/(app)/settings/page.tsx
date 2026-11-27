"use client";

import Link from "next/link";
import { BarChart3, BookOpen, ChevronRight } from "lucide-react";
import { SettingsView } from "@/components/dashboard/SettingsView";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your profile, notifications, app install, and password.
        </p>
      </div>

      {/* Reports isn't in the phone tab bar, so surface it here */}
      <Link
        href="/reports"
        className="md:hidden flex items-center gap-3 border border-border bg-card rounded-2xl p-4 shadow-sm active:bg-muted"
      >
        <span className="p-2.5 rounded-xl bg-brand-indigo/10 text-brand-indigo">
          <BarChart3 className="w-5 h-5" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-foreground">
            Reports
          </span>
          <span className="block text-xs text-muted-foreground">
            Weekly & monthly productivity summaries
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </Link>

      <Link
        href="/guide"
        data-tour="guide-link"
        className="flex items-center gap-3 border border-border bg-card rounded-2xl p-4 shadow-sm active:bg-muted"
      >
        <span className="p-2.5 rounded-xl bg-brand-indigo/10 text-brand-indigo">
          <BookOpen className="w-5 h-5" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-foreground">
            How Nudger works
          </span>
          <span className="block text-xs text-muted-foreground">
            A guide to tasks, nudges, reports and notifications
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </Link>

      <SettingsView />
    </div>
  );
}
