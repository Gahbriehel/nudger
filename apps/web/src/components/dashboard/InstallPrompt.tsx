"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, PlusSquare, Smartphone, Download } from "lucide-react";
import { isIOSDevice, isStandaloneDisplay } from "@/lib/platform";
import { canAsk, recordDismissal, recordDone } from "@/lib/promptCooldown";
import { usePromptStore } from "@/store/promptStore";
import { useTaskStore } from "@/store/taskStore";

const SHOW_DELAY_MS = 8000;

/** Step-by-step "Add to Home Screen" guide for iOS (no install API there). */
export function IosInstallSteps() {
  return (
    <ol className="space-y-2.5 text-xs text-foreground/85">
      <li className="flex items-center gap-2.5">
        <span className="w-6 h-6 shrink-0 rounded-full bg-foreground/5 dark:bg-foreground/10 flex items-center justify-center font-semibold">
          1
        </span>
        <span>
          Tap{" "}
          <span className="inline-flex items-center gap-0.5 align-middle font-semibold text-primary">
            <Share size={13} /> Share
          </span>{" "}
          in Safari&apos;s toolbar.
        </span>
      </li>
      <li className="flex items-center gap-2.5">
        <span className="w-6 h-6 shrink-0 rounded-full bg-foreground/5 dark:bg-foreground/10 flex items-center justify-center font-semibold">
          2
        </span>
        <span>
          Choose{" "}
          <span className="inline-flex items-center gap-0.5 align-middle font-semibold text-primary">
            <PlusSquare size={13} /> Add to Home Screen
          </span>
          .
        </span>
      </li>
      <li className="flex items-center gap-2.5">
        <span className="w-6 h-6 shrink-0 rounded-full bg-foreground/5 dark:bg-foreground/10 flex items-center justify-center font-semibold">
          3
        </span>
        <span>Open Nudger from your Home Screen.</span>
      </li>
    </ol>
  );
}

/**
 * Bottom-sheet install suggestion. Only shown when installing is actually
 * possible (Chromium install prompt available, or iOS where it's the only way
 * to get push notifications), to users who already have tasks, and only when
 * the prompt coordinator says nothing else is on screen.
 */
export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const hasLoaded = useTaskStore((s) => s.hasLoaded);
  const { deferredInstall, setDeferredInstall, tryAcquire, release } =
    usePromptStore();
  const scheduledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!hasLoaded || scheduledRef.current) return;
    if (isStandaloneDisplay() || !canAsk("install")) return;

    const ios = isIOSDevice();
    // Desktop/Android without an install prompt: nothing actionable to offer
    if (!ios && !deferredInstall) return;
    if (useTaskStore.getState().tasks.length === 0) return;

    scheduledRef.current = true;
    setIsIOS(ios);
    timerRef.current = setTimeout(() => {
      if (tryAcquire("install")) setShow(true);
    }, SHOW_DELAY_MS);
  }, [hasLoaded, deferredInstall, tryAcquire]);

  const close = () => {
    setShow(false);
    release("install");
  };

  const handleDismiss = () => {
    recordDismissal("install");
    close();
  };

  const handleInstall = async () => {
    if (!deferredInstall) return;
    await deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    setDeferredInstall(null); // the event can only be used once
    if (outcome === "accepted") recordDone("install");
    else recordDismissal("install");
    close();
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-prompt-title"
      className="fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pointer-events-none"
    >
      <div className="pointer-events-auto relative w-full max-w-md border border-border bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={handleDismiss}
          aria-label="Not now"
          className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 p-2 rounded-full transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="p-2.5 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground rounded-xl shrink-0">
            <Smartphone size={20} />
          </div>
          <div className="space-y-1">
            <h3
              id="install-prompt-title"
              className="font-bold text-sm text-foreground"
            >
              {isIOS ? "Add Nudger to your Home Screen" : "Install Nudger"}
            </h3>
            <p className="text-xs text-muted-foreground leading-normal">
              {isIOS
                ? "On iPhone, reminders only arrive once Nudger is installed."
                : "Open it like an app and get reminders even when the browser is closed."}
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="mt-4 pt-4 border-t border-border/60">
            <IosInstallSteps />
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl gap-2"
            >
              <Download size={15} />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="h-11 px-4 text-sm text-muted-foreground"
            >
              Not now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
