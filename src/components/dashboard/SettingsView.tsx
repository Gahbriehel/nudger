"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import {
  getPushSubscription,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from "@/lib/pushNotification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SettingsView() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.name || "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Push Notification state
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [permissionState, setPermissionState] = useState<string>("default");
  const [titleClickCount, setTitleClickCount] = useState(0);
  const titleClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notification Control settings state
  const [maxFlexibleNudges, setMaxFlexibleNudges] = useState(2);
  const [enableIdleNudges, setEnableIdleNudges] = useState(true);
  const [enableSubtaskNudges, setEnableSubtaskNudges] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("07:00");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    // Check support for Push Notifications
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setIsPushSupported(supported);

    if (supported) {
      setPermissionState(Notification.permission);
      getPushSubscription()
        .then((sub) => {
          setIsSubscribed(!!sub);
        })
        .catch((err) =>
          console.error("Error fetching push subscription state:", err),
        );
    }

    // Fetch User Settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          if (data.max_flexible_nudges_per_day !== undefined)
            setMaxFlexibleNudges(data.max_flexible_nudges_per_day);
          if (data.enable_idle_nudges !== undefined)
            setEnableIdleNudges(data.enable_idle_nudges);
          if (data.enable_subtask_nudges !== undefined)
            setEnableSubtaskNudges(data.enable_subtask_nudges);
          if (data.quiet_hours_enabled !== undefined)
            setQuietHoursEnabled(data.quiet_hours_enabled);
          if (data.quiet_hours_start)
            setQuietHoursStart(data.quiet_hours_start);
          if (data.quiet_hours_end) setQuietHoursEnd(data.quiet_hours_end);
        }
      })
      .catch((err) => console.error("Failed to load user settings:", err))
      .finally(() => setIsLoadingSettings(false));
  }, []);

  const handleSaveNotificationSettings = async (
    updates: Partial<{
      max_flexible_nudges_per_day: number;
      enable_idle_nudges: boolean;
      enable_subtask_nudges: boolean;
      quiet_hours_enabled: boolean;
      quiet_hours_start: string;
      quiet_hours_end: string;
    }>,
  ) => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      toast.success("Notification preferences updated!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update preferences",
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTitleClick = useCallback(() => {
    setTitleClickCount((prev) => {
      const next = prev + 1;
      if (titleClickTimer.current) clearTimeout(titleClickTimer.current);
      if (next >= 3) {
        sendTestNotification();
        return 0;
      }
      titleClickTimer.current = setTimeout(() => setTitleClickCount(0), 1500);
      return next;
    });
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }

    setIsUpdatingName(true);
    try {
      const { user: updatedUser } = await authService.updateProfile(
        displayName.trim(),
      );
      setUser(updatedUser);
      toast.success("Profile updated successfully!");
      setIsEditingName(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authService.updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
      setIsEditingPassword(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update password",
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const sendTestNotification = async (
    inlineSubscription?: PushSubscription,
  ) => {
    setIsSendingTest(true);
    try {
      const body = inlineSubscription
        ? JSON.stringify({ subscription: inlineSubscription.toJSON() })
        : JSON.stringify({});

      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(`Test failed: ${data.error ?? "Unknown error"}`);
      } else {
        toast.success(data.message ?? "Test notification sent!", {
          description:
            "Check your device — a push notification should arrive shortly.",
          duration: 8000,
        });
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not send test notification.",
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTogglePush = async () => {
    if (!isPushSupported) return;

    setIsTogglingPush(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        await unsubscribeUserFromPush();
        setIsSubscribed(false);
        toast.success("Unsubscribed from push notifications.");
      } else {
        // Subscribe — then immediately fire a test push to confirm the pipeline
        const sub = await subscribeUserToPush();
        setIsSubscribed(!!sub);
        setPermissionState(Notification.permission);
        toast.success("Subscribed! Sending a test notification now…", {
          description:
            "You should receive a push notification in a few seconds.",
          duration: 6000,
        });
        if (sub) {
          // Pass the fresh subscription object directly so the test works
          // even before Supabase has committed the upsert
          await sendTestNotification(sub);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to toggle notifications permission.",
      );
      // update state in case permission was denied
      setPermissionState(Notification.permission);
    } finally {
      setIsTogglingPush(false);
    }
  };

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
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Profile Settings Card */}
      <div className="border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">
          Profile Settings
        </h2>
        {isEditingName ? (
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Email Address (Read-only)
              </span>
              <div className="text-sm text-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/80 cursor-not-allowed opacity-70">
                {user?.email || "N/A"}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label
                htmlFor="displayName"
                className="text-xs font-semibold flex items-center gap-1"
              >
                Display Name
                <span
                  className="text-destructive text-[10px]"
                  aria-label="required"
                >
                  *
                </span>
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="bg-background border-border text-sm h-10 rounded-xl"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
                disabled={isUpdatingName}
              >
                {isUpdatingName ? <Spinner size="sm" /> : "Save Changes"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setDisplayName(user?.user_metadata?.name || "");
                  setIsEditingName(false);
                }}
                variant="outline"
                className="text-xs h-9 px-4 rounded-lg font-semibold"
                disabled={isUpdatingName}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Email Address
              </span>
              <div className="text-sm text-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/80">
                {user?.email || "N/A"}
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Display Name
              </span>
              <div className="text-sm text-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/80">
                {user?.user_metadata?.name || "N/A"}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                setDisplayName(user?.user_metadata?.name || "");
                setIsEditingName(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
            >
              Edit Profile
            </Button>
          </div>
        )}
      </div>

      {/* Push Notifications Settings Card */}
      <div className="border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        <h2
          className="text-lg font-bold tracking-tight text-foreground mb-1 select-none cursor-default"
          onClick={handleTitleClick}
          title={
            titleClickCount > 0 ? `${3 - titleClickCount} more…` : undefined
          }
        >
          Notification Preferences
        </h2>
        <p className="text-xs text-muted-foreground leading-normal mb-5">
          Manage how Nudger reminds you about your due tasks when you are away.
        </p>

        <div className="space-y-4">
          {/* Reassurance Notice */}
          <div className="bg-primary/5 border border-primary/20 text-foreground text-xs rounded-xl p-3.5 leading-normal flex items-start gap-2.5">
            <span className="text-base shrink-0">📌</span>
            <div>
              <span className="font-semibold text-primary block mb-0.5">
                Guaranteed Due Dates & Recurring Tasks
              </span>
              <span>
                Tasks with set due dates and recurring habits will{" "}
                <strong>always</strong> alert you on time. Use the options below
                to tune flexible nudges and Quiet Hours.
              </span>
            </div>
          </div>

          {!isPushSupported ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-xl p-3.5 leading-normal">
              ⚠️ Push notifications are not supported in your current browser or
              mode. To receive push notifications on iOS, please install Nudger
              to your Home Screen first (see PWA instructions below).
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block text-foreground">
                  Browser Push Notifications
                </span>
                <span className="text-[11px] text-muted-foreground leading-normal block">
                  {permissionState === "denied"
                    ? "Notification permission is blocked. Please reset site permissions in your browser settings to enable."
                    : "Receive task nudges directly on your desktop or mobile device."}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {(isTogglingPush || isSendingTest) && <Spinner size="sm" />}
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={
                    isTogglingPush ||
                    isSendingTest ||
                    (permissionState === "denied" && !isSubscribed)
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSubscribed ? "bg-primary" : "bg-input"
                  } ${isTogglingPush || isSendingTest || (permissionState === "denied" && !isSubscribed) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                      isSubscribed ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Smart Controls Division */}
          <div className="pt-2 space-y-4 border-t border-border/60">
            {/* Daily Flexible Nudge Cap */}
            <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
              <div className="space-y-0.5 pr-4">
                <Label
                  htmlFor="maxFlexibleNudges"
                  className="text-sm font-semibold block text-foreground"
                >
                  Max Daily Flexible Nudges
                </Label>
                <span className="text-[11px] text-muted-foreground leading-normal block">
                  Caps random reminders for flexible tasks per day to prevent
                  notification fatigue.
                </span>
              </div>
              <select
                id="maxFlexibleNudges"
                value={maxFlexibleNudges}
                disabled={isLoadingSettings || isSavingSettings}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxFlexibleNudges(val);
                  handleSaveNotificationSettings({
                    max_flexible_nudges_per_day: val,
                  });
                }}
                className="bg-background border border-border text-foreground text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value={1}>1 / day (Minimal)</option>
                <option value={2}>2 / day (Balanced)</option>
                <option value={3}>3 / day (Active)</option>
                <option value={5}>5 / day (Frequent)</option>
                <option value={10}>10 / day (Maximum)</option>
              </select>
            </div>

            {/* Quiet Hours */}
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <span className="text-sm font-semibold block text-foreground">
                    Quiet Hours
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-normal block">
                    Pause flexible reminders and idle nudges during your quiet
                    window.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !quietHoursEnabled;
                    setQuietHoursEnabled(nextVal);
                    handleSaveNotificationSettings({
                      quiet_hours_enabled: nextVal,
                    });
                  }}
                  disabled={isLoadingSettings || isSavingSettings}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    quietHoursEnabled ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                      quietHoursEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {quietHoursEnabled && (
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="flex-1 grid gap-1">
                    <Label
                      htmlFor="quietStart"
                      className="text-[11px] font-semibold text-muted-foreground"
                    >
                      Start Time
                    </Label>
                    <Input
                      id="quietStart"
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      onBlur={() =>
                        handleSaveNotificationSettings({
                          quiet_hours_start: quietHoursStart,
                        })
                      }
                      className="bg-background border-border text-xs h-8 rounded-lg"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground self-end mb-1.5">
                    to
                  </span>
                  <div className="flex-1 grid gap-1">
                    <Label
                      htmlFor="quietEnd"
                      className="text-[11px] font-semibold text-muted-foreground"
                    >
                      End Time
                    </Label>
                    <Input
                      id="quietEnd"
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      onBlur={() =>
                        handleSaveNotificationSettings({
                          quiet_hours_end: quietHoursEnd,
                        })
                      }
                      className="bg-background border-border text-xs h-8 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Subtask Prompts Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block text-foreground">
                  Checklist & Subtask Nudges 📝
                </span>
                <span className="text-[11px] text-muted-foreground leading-normal block">
                  Include specific subtasks in reminders to help break down
                  larger tasks.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextVal = !enableSubtaskNudges;
                  setEnableSubtaskNudges(nextVal);
                  handleSaveNotificationSettings({
                    enable_subtask_nudges: nextVal,
                  });
                }}
                disabled={isLoadingSettings || isSavingSettings}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableSubtaskNudges ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    enableSubtaskNudges ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Idle User Nudges Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block text-foreground">
                  Idle Prompts 👋
                </span>
                <span className="text-[11px] text-muted-foreground leading-normal block">
                  Get a friendly prompt when your task list is clear to add new
                  goals.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextVal = !enableIdleNudges;
                  setEnableIdleNudges(nextVal);
                  handleSaveNotificationSettings({
                    enable_idle_nudges: nextVal,
                  });
                }}
                disabled={isLoadingSettings || isSavingSettings}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableIdleNudges ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    enableIdleNudges ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security/Password Settings Card */}
      <div className="border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">
          Change Password
        </h2>
        {isEditingPassword ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid gap-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold flex items-center gap-1"
              >
                New Password
                <span
                  className="text-destructive text-[10px]"
                  aria-label="required"
                >
                  *
                </span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="bg-background border-border text-sm h-10 rounded-xl"
              />
            </div>

            <div className="grid gap-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs font-semibold flex items-center gap-1"
              >
                Confirm New Password
                <span
                  className="text-destructive text-[10px]"
                  aria-label="required"
                >
                  *
                </span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="bg-background border-border text-sm h-10 rounded-xl"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? <Spinner size="sm" /> : "Update Password"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setPassword("");
                  setConfirmPassword("");
                  setIsEditingPassword(false);
                }}
                variant="outline"
                className="text-xs h-9 px-4 rounded-lg font-semibold"
                disabled={isUpdatingPassword}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Password
              </span>
              <div className="text-sm text-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/80">
                ••••••••
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsEditingPassword(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
            >
              Change Password
            </Button>
          </div>
        )}
      </div>

      {/* Account Actions Card */}
      <div className="border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">
          Account Actions
        </h2>
        <div className="space-y-4">
          <Button
            onClick={handleSignOut}
            variant="destructive"
            className="w-full sm:w-auto h-9 px-4 rounded-lg font-semibold text-xs"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
