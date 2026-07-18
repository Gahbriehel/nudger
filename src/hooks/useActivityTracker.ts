"use client";

import { useEffect, useRef } from "react";

export function useActivityTracker() {
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    const pingActivity = async () => {
      const now = Date.now();
      // Throttle pings to once every 5 minutes (300,000 ms)
      if (now - lastPingRef.current > 5 * 60 * 1000) {
        try {
          await fetch("/api/activity", { method: "POST" });
          lastPingRef.current = now;
        } catch (error) {
          console.error("Failed to update activity:", error);
        }
      }
    };

    // Ping on mount
    pingActivity();

    // Ping on window focus
    const handleFocus = () => {
      pingActivity();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}
