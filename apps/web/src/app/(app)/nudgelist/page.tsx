"use client";

import { NudgelistView } from "@/components/dashboard/NudgelistView";

export default function NudgelistPage() {
  return (
    <div className="space-y-6">
      <title>Nudges · Nudger</title>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Nudges
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks that slipped past their date or haven&apos;t been touched in a
          while.
        </p>
      </div>
      <NudgelistView />
    </div>
  );
}
