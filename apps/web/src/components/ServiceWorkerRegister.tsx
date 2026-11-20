"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pushNotification";
import { recordDone } from "@/lib/promptCooldown";
import {
  usePromptStore,
  type BeforeInstallPromptEvent,
} from "@/store/promptStore";

export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Capture the install prompt as early as possible (it fires once, shortly
  // after load) so the install UI can use it whenever it's allowed to show.
  useEffect(() => {
    const { setDeferredInstall } = usePromptStore.getState();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstall(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setDeferredInstall(null);
      recordDone("install");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return null;
}
