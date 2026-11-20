"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { readTaskCache, useOnline } from "@/lib/offline";
import { formatWhen } from "@/lib/taskFormat";

/** Slim notice while offline: what you see is a saved copy, edits are paused. */
export function OfflineBanner() {
  const online = useOnline();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!online) setSavedAt(readTaskCache()?.savedAt ?? null);
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-500/25 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2.5 text-sm">
        <CloudOff className="w-4 h-4 shrink-0" />
        <p className="min-w-0">
          <span className="font-semibold">You&apos;re offline.</span> Showing
          your saved tasks; changes are paused.
          {savedAt && (
            <span className="block text-xs opacity-80">
              Last synced {formatWhen(savedAt)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
