import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

/**
 * Keyboard and screen-reader behaviour every dialog needs:
 * - moves focus into the dialog when it opens (unless something inside
 *   already took it, e.g. an autofocused input)
 * - keeps Tab/Shift+Tab inside it
 * - Escape calls `onEscape`
 * - returns focus to whatever opened it when it closes
 *
 * The container should have `tabIndex={-1}` so it can receive focus.
 */
export function useDialogFocus(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onEscape?: () => void,
) {
  // Always call the latest handler without re-running the focus logic
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const root = containerRef.current;
      if (root && !root.contains(document.activeElement)) root.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      const root = containerRef.current;
      // Stacked dialogs: only the one that holds focus reacts
      if (!root || !root.contains(document.activeElement)) return;

      if (e.key === "Escape" && escapeRef.current) {
        e.preventDefault();
        escapeRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusableIn(root);
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      if (previous && previous.isConnected && previous !== document.body) {
        previous.focus();
      }
    };
  }, [active, containerRef]);
}
