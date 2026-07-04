"use client";

import { useState, useEffect } from "react";
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

export function SettingsView() {
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.name || "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Push Notification state
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [permissionState, setPermissionState] = useState<string>("default");

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

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Profile Settings Card */}
      <div className="border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">
          Profile Settings
        </h2>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div className="grid gap-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-semibold text-muted-foreground"
            >
              Email Address (Read-only)
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted border-border cursor-not-allowed opacity-70 text-sm h-10 rounded-xl"
            />
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

          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
            disabled={isUpdatingName}
          >
            {isUpdatingName ? <Spinner size="sm" /> : "Save Changes"}
          </Button>
        </form>
      </div>

      {/* Push Notifications Settings Card */}
      <div className="border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">
          Notification Preferences
        </h2>
        <p className="text-xs text-muted-foreground leading-normal mb-5">
          Manage how Nudger reminds you about your due tasks when you are away.
        </p>

        <div className="space-y-4">
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
                    : "Receive urgent task nudges directly on your desktop or mobile device."}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {(isTogglingPush || isSendingTest) && <Spinner size="sm" />}
                {/* {isSubscribed && (
                  <button
                    type="button"
                    onClick={() => sendTestNotification()}
                    disabled={isSendingTest || isTogglingPush}
                    title="Send a test push notification to confirm it's working"
                    className="text-[11px] font-semibold text-primary underline underline-offset-2 hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSendingTest ? "Sending…" : "Send Test"}
                  </button>
                )} */}
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
        </div>
      </div>

      {/* Security/Password Settings Card */}
      <div className="border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">
          Change Password
        </h2>
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

          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-lg"
            disabled={isUpdatingPassword}
          >
            {isUpdatingPassword ? <Spinner size="sm" /> : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
