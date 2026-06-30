"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Share2, PlusSquare, Smartphone, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 1. Check if running in standalone (installed) mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Check if user previously dismissed the banner
    const isDismissed =
      localStorage.getItem("nudger_pwa_banner_dismissed") === "true";

    if (isStandalone || isDismissed) {
      return; // Do not show the banner
    }

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.maxTouchPoints > 0 && /macintosh/.test(userAgent)); // iPadOS 13+
    setIsIOS(iosDetected);

    // 3. Listen for Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If it is iOS Safari, show the banner since it does not fire beforeinstallprompt
    if (iosDetected) {
      setShowBanner(true);
    }

    // Fallback: If not standalone and not dismissed, show it anyway to give general PWA support
    if (!iosDetected && !deferredPrompt) {
      // We can show it after a delay or just enable it for testing
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("nudger_pwa_banner_dismissed", "true");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="relative border border-brand-indigo/35 bg-gradient-to-r from-brand-indigo/10 to-brand-blue/10 dark:from-brand-indigo/5 dark:to-brand-blue/5 backdrop-blur-md p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg overflow-hidden transition-all duration-300 before:absolute before:top-0 before:left-0 before:bottom-0 before:w-[4px] before:bg-gradient-to-b before:from-brand-indigo before:to-brand-blue">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground hover:bg-muted/40 p-1.5 rounded-full transition-colors"
        aria-label="Dismiss banner"
      >
        <X size="15" />
      </button>

      <div className="flex items-start gap-3.5 pr-6">
        <div className="p-3 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground rounded-xl flex-shrink-0">
          <Smartphone size="20" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
            Install Nudger App
          </h3>
          <p className="text-xs text-muted-foreground leading-normal max-w-xl">
            Get instant task notifications, better performance, and mobile app
            layout by adding Nudger to your home screen. No App Store download
            required!
          </p>

          {/* iOS Safari Guide */}
          {isIOS && (
            <div className="mt-3.5 pt-3.5 border-t border-border/50 space-y-2 text-[11px] text-foreground/80">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                iOS PWA Setup Instructions:
              </p>
              <ol className="list-none space-y-2.5 pl-0">
                <li className="flex items-center gap-2">
                  <span className="bg-foreground/5 dark:bg-foreground/10 px-2 py-0.5 rounded font-mono font-semibold">
                    1
                  </span>
                  <span>
                    Tap Safari&apos;s{" "}
                    <span className="inline-flex items-center align-middle font-semibold text-primary">
                      <Share2 size="13" className="inline mr-0.5" /> Share
                    </span>{" "}
                    button (bottom bar on iPhone, top on iPad).
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-foreground/5 dark:bg-foreground/10 px-2 py-0.5 rounded font-mono font-semibold">
                    2
                  </span>
                  <span>
                    Scroll down and select{" "}
                    <span className="font-semibold text-primary inline-flex items-center align-middle">
                      <PlusSquare size="13" className="inline mr-0.5" /> Add to
                      Home Screen
                    </span>
                    .
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-foreground/5 dark:bg-foreground/10 px-2 py-0.5 rounded font-mono font-semibold">
                    3
                  </span>
                  <span>
                    Name it <span className="font-bold">Nudger</span> and click{" "}
                    <span className="font-bold text-primary">Add</span>.
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Action Button for Android/Chrome */}
      {!isIOS && deferredPrompt && (
        <div className="flex-shrink-0 flex items-center pr-2">
          <Button
            onClick={handleInstallClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9.5 px-4.5 rounded-xl shadow-md flex items-center gap-2"
          >
            <Download size="14" />
            Install App
          </Button>
        </div>
      )}
    </div>
  );
}
