"use client";

import { AuthenticatedLayout } from "@/components/dashboard/AuthenticatedLayout";
import { SettingsView } from "@/components/dashboard/SettingsView";

export default function SettingsPage() {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Account Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1 leading-normal">
            Update your display name, configure push notifications, or change
            your password.
          </p>
        </div>
        <SettingsView />
      </div>
    </AuthenticatedLayout>
  );
}
