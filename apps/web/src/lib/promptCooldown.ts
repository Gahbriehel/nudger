// Escalating back-off for permission/install asks so dismissing a prompt
// means "not now", not "ask me again tomorrow forever".
//
// Dismissal 1 -> wait 1 day, 2 -> 3 days, 3 -> 7 days, 4 -> 30 days,
// 5th dismissal -> stop asking (the user can still act from Settings).

const BACKOFF_DAYS = [1, 3, 7, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

export type PromptKey = "notifications" | "install";

interface CooldownRecord {
  dismissals: number;
  nextAt: number;
  /** Accepted, or asked enough times — never prompt again. */
  done?: boolean;
}

const storageKey = (key: PromptKey) => `nudger_prompt_${key}`;

function read(key: PromptKey): CooldownRecord {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw) return JSON.parse(raw) as CooldownRecord;

    // Carry over dismissals from the previous prompt implementation
    if (
      key === "install" &&
      localStorage.getItem("nudger_pwa_banner_dismissed") === "true"
    ) {
      return { dismissals: 1, nextAt: Date.now() + BACKOFF_DAYS[1] * DAY_MS };
    }
    if (key === "notifications") {
      const legacyNext = Number(
        localStorage.getItem("nudger_next_notification_prompt"),
      );
      if (legacyNext > Date.now()) return { dismissals: 1, nextAt: legacyNext };
    }
  } catch {
    // Storage unavailable (private mode, etc.) — treat as never asked
  }
  return { dismissals: 0, nextAt: 0 };
}

function write(key: PromptKey, rec: CooldownRecord) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(rec));
  } catch {
    // Ignore — worst case we ask again next session
  }
}

/**
 * Whether we may show this ask now. `ignoreCooldown` is for contextual asks
 * (e.g. right after the user creates a timed task): they skip the waiting
 * period but still respect "stopped asking".
 */
export function canAsk(
  key: PromptKey,
  opts: { ignoreCooldown?: boolean } = {},
): boolean {
  const rec = read(key);
  if (rec.done) return false;
  if (opts.ignoreCooldown) return true;
  return Date.now() >= rec.nextAt;
}

export function recordDismissal(key: PromptKey) {
  const rec = read(key);
  const dismissals = rec.dismissals + 1;
  if (dismissals > BACKOFF_DAYS.length) {
    write(key, { dismissals, nextAt: Infinity, done: true });
    return;
  }
  write(key, {
    dismissals,
    nextAt: Date.now() + BACKOFF_DAYS[dismissals - 1] * DAY_MS,
  });
}

export function recordDone(key: PromptKey) {
  const rec = read(key);
  write(key, { ...rec, done: true });
}
