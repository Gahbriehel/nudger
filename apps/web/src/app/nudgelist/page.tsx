"use client";

import { AuthenticatedLayout } from "@/components/dashboard/AuthenticatedLayout";
import { NudgelistView } from "@/components/dashboard/NudgelistView";

export default function NudgelistPage() {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Task Nudgelist
          </h1>
          <p className="text-xs text-muted-foreground mt-1 leading-normal">
            These tasks require engagement or snooze scheduling due to age or
            missed deadlines.
          </p>
        </div>
        <NudgelistView />
      </div>
    </AuthenticatedLayout>
  );
}
