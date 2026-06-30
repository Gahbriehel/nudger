"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pushNotification";

export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
