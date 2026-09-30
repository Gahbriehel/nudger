import * as React from "react";

import { cn } from "@/lib/utils";

// iOS Safari (WebKit bug #148061) never reliably lets you drag-scroll back
// through an overflowed single-line input's text — this also breaks the
// spacebar cursor-trackpad gesture. Not fixable via CSS; Android is unaffected.
const isIOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onTouchStart, onTouchMove, onTouchEnd, ...props }, ref) => {
    const dragRef = React.useRef<{ x: number; scrollLeft: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent<HTMLInputElement>) => {
      if (isIOS) {
        const el = e.currentTarget;
        if (el.scrollWidth > el.clientWidth) {
          dragRef.current = { x: e.touches[0].clientX, scrollLeft: el.scrollLeft };
        }
      }
      onTouchStart?.(e);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLInputElement>) => {
      if (dragRef.current) {
        const dx = e.touches[0].clientX - dragRef.current.x;
        if (Math.abs(dx) > 4) {
          e.currentTarget.scrollLeft = dragRef.current.scrollLeft - dx;
          e.preventDefault();
        }
      }
      onTouchMove?.(e);
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLInputElement>) => {
      dragRef.current = null;
      onTouchEnd?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 min-w-0 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
