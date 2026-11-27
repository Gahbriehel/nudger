"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { usePromptStore } from "@/store/promptStore";
import { useTourStore } from "@/store/tourStore";
import { TOUR_STEPS } from "@/lib/tour";

const DONE_KEY = "nudger_tour_done";
/** Only accounts this young get the tour automatically; others can replay. */
const AUTO_START_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
/** Let the page settle (and announcements claim the screen) before starting. */
const START_DELAY_MS = 1200;
const NAVIGATION_WAIT_MS = 3000;

const readDone = () => {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeDone = () => {
  try {
    localStorage.setItem(DONE_KEY, "1");
  } catch {
    // Private mode etc.: the Supabase flag still covers us
  }
};

/** First element for a tour target that is actually on screen (the phone tab
 * bar and desktop header both carry the same ids; one is display:none). */
function findTarget(id: string): Element | null {
  const all = document.querySelectorAll(`[data-tour="${id}"]`);
  for (const el of all) {
    if (el.getClientRects().length > 0) return el;
  }
  return null;
}

function waitForTarget(id: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      if (findTarget(id)) return resolve(true);
      if (Date.now() - started > timeoutMs) return resolve(false);
      setTimeout(check, 100);
    };
    check();
  });
}

/**
 * Guided tour: spotlights real controls, moving across pages as it goes.
 * Starts once for new accounts (tracked in Supabase, mirrored in
 * localStorage) and on demand via "Replay tour".
 */
export function WelcomeTour() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const createdAt = useAuthStore((s) => s.user?.created_at);
  const hasLoaded = useTaskStore((s) => s.hasLoaded);
  const replayRequest = useTourStore((s) => s.replayRequest);

  const driverRef = useRef<Driver | null>(null);
  const checkedRef = useRef(false);
  const startingRef = useRef(false);

  const markDone = useCallback(() => {
    writeDone();
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tour_completed: true }),
    }).catch(() => {});
  }, []);

  const start = useCallback(async () => {
    if (driverRef.current || startingRef.current) return;
    const { tryAcquire, release } = usePromptStore.getState();
    // Contextual: a replay is the user's own request, not a background ask
    if (!tryAcquire("tour", { contextual: true })) return;
    startingRef.current = true;

    let driver: typeof import("driver.js").driver;
    try {
      ({ driver } = await import("driver.js"));
    } catch {
      startingRef.current = false;
      release("tour");
      return;
    }
    const lastIndex = TOUR_STEPS.length - 1;
    const isPhone = window.matchMedia("(max-width: 767px)").matches;
    let finished = false;

    // Tracked here rather than read from driver.js internals, which can be
    // mid-transition (and unset) when a button is clicked.
    let current = 0;

    /** Move to the next/previous step that can be shown, changing page first
     * when the step lives elsewhere. A step whose target never appears is
     * skipped rather than ending the whole tour. */
    const go = async (d: Driver, direction: 1 | -1) => {
      let index = current + direction;
      while (index >= 0 && index <= lastIndex) {
        const step = TOUR_STEPS[index];
        if (window.location.pathname !== step.route) router.push(step.route);
        if (
          !step.target ||
          (await waitForTarget(step.target, NAVIGATION_WAIT_MS))
        ) {
          current = index;
          d.moveTo(index);
          return;
        }
        console.warn(`[tour] target "${step.target}" not found, skipping`);
        index += direction;
      }
      if (direction === 1) d.destroy(); // ran past the last step: finished
    };

    const tour = driver({
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      showButtons: ["next", "previous"],
      // Esc closes; stray taps on the dimmed page do not
      overlayClickBehavior: "none",
      stagePadding: 6,
      stageRadius: 12,
      popoverOffset: 12,
      popoverClass: "nudger-tour",
      steps: TOUR_STEPS.map((step, i) => ({
        element: step.target
          ? () => findTarget(step.target as string) as Element
          : undefined,
        popover: {
          title: step.title,
          description: step.body,
          // Phone controls sit at the bottom of the screen: open upwards
          side:
            isPhone && step.target?.startsWith("nav-")
              ? "top"
              : step.target === "add-task" && isPhone
                ? "top"
                : undefined,
          ...(i === 0 && { showButtons: ["next"] as const }),
        },
      })),
      onPopoverRender: (popover) => {
        popover.footer.querySelector(".nudger-tour-skip")?.remove();
        if (current === lastIndex) return;
        const skip = document.createElement("button");
        skip.type = "button";
        skip.className = "driver-popover-footer-btn nudger-tour-skip";
        skip.textContent = "Skip";
        skip.addEventListener("click", () => tour.destroy());
        popover.footer.insertBefore(skip, popover.footerButtons);
      },
      onNextClick: () => {
        if (current >= lastIndex) return tour.destroy();
        void go(tour, 1);
      },
      onDoneClick: () => tour.destroy(),
      onPrevClick: () => {
        if (current > 0) void go(tour, -1);
      },
      onDestroyStarted: (_el, _step, { reason }) => {
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[tour] closing at step ${current}, reason: ${reason}`);
        }
        tour.destroy();
      },
      onDestroyed: () => {
        if (finished) return;
        finished = true;
        driverRef.current = null;
        startingRef.current = false;
        release("tour");
        markDone();
        // Leave the user on Home, where the tour began
        if (window.location.pathname !== "/") router.push("/");
      },
    });

    driverRef.current = tour;
    tour.drive();
  }, [markDone, router]);

  // First sign-in: start automatically for new accounts that haven't seen it
  useEffect(() => {
    if (!hasLoaded || !userId || checkedRef.current) return;
    checkedRef.current = true;

    if (readDone()) return;
    if (!navigator.onLine || window.location.pathname !== "/") return;
    const age = createdAt ? Date.now() - new Date(createdAt).getTime() : null;
    if (age === null || age > AUTO_START_MAX_AGE_MS) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (cancelled || !settings) return;
        if (settings.tour_completed_at) {
          writeDone();
          return;
        }
        timer = setTimeout(() => void start(), START_DELAY_MS);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasLoaded, userId, createdAt, start]);

  // "Replay tour"
  const lastReplayRef = useRef(replayRequest);
  useEffect(() => {
    if (replayRequest === lastReplayRef.current) return;
    lastReplayRef.current = replayRequest;
    if (window.location.pathname !== "/") router.push("/");
    void waitForTarget("today", NAVIGATION_WAIT_MS).then(() => void start());
  }, [replayRequest, router, start]);

  // Never leave the overlay behind if the layout unmounts (e.g. sign-out)
  useEffect(
    () => () => {
      driverRef.current?.destroy();
    },
    [],
  );

  return null;
}
