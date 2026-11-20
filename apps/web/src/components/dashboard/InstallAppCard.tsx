"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IosInstallSteps } from "./InstallPrompt";
import { isIOSDevice, isStandaloneDisplay } from "@/lib/platform";
import { recordDone } from "@/lib/promptCooldown";
import { usePromptStore } from "@/store/promptStore";

/** Settings card: the permanent home for installing the app, so dismissing
 * the install prompt never leaves the user without a way to do it. */
export function InstallAppCard() {
  const { deferredInstall, setDeferredInstall } = usePromptStore();
  const [platform, setPlatform] = useState<{
    standalone: boolean;
    ios: boolean;
  } | null>(null);

  useEffect(() => {
    setPlatform({ standalone: isStandaloneDisplay(), ios: isIOSDevice() });
  }, []);

  const handleInstall = async () => {
    if (!deferredInstall) return;
    await deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    setDeferredInstall(null);
    if (outcome === "accepted") recordDone("install");
  };

  if (!platform) return null;

  return (
    <div className="border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
      <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">
        Nudger App
      </h2>

      {platform.standalone ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          You&apos;re using the installed app.
        </p>
      ) : platform.ios ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-normal">
            Install Nudger to your Home Screen to receive reminders on iPhone
            and iPad.
          </p>
          <IosInstallSteps />
        </div>
      ) : deferredInstall ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-normal">
            Install Nudger to open it like an app and get reminders even when
            the browser is closed.
          </p>
          <Button
            onClick={handleInstall}
            className="h-10 px-4 rounded-lg font-semibold text-sm gap-2"
          >
            <Download className="w-4 h-4" />
            Install app
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground leading-normal mt-1">
          To install, use your browser menu and choose{" "}
          <span className="font-semibold text-foreground">Install app</span> or{" "}
          <span className="font-semibold text-foreground">
            Add to Home screen
          </span>
          .
        </p>
      )}
    </div>
  );
}
