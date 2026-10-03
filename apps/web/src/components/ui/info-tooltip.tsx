"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  children: React.ReactNode;
  className?: string;
}

const PANEL_WIDTH = 256; // px, matches w-64
const VIEWPORT_MARGIN = 12; // px gutter kept clear on both edges

interface Position {
  top: number;
  left: number;
  width: number;
}

export function InfoTooltip({ children, className }: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<Position | null>(null);
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const contentId = React.useId();

  const updatePosition = React.useCallback(() => {
    const trigger = containerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(
      PANEL_WIDTH,
      window.innerWidth - VIEWPORT_MARGIN * 2,
    );
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );
    setPosition({ top: rect.bottom + 6, left, width });
  }, []);

  React.useEffect(() => {
    if (!open) return;

    updatePosition();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <span ref={containerRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="More information"
        aria-expanded={open}
        aria-controls={contentId}
        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            id={contentId}
            role="tooltip"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="z-50 rounded-md border border-border bg-popover text-popover-foreground text-xs leading-relaxed p-2.5 shadow-md"
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  );
}
