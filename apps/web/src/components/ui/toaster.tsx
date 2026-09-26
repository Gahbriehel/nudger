"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Toast } from "@/hooks/useToast";

interface ToasterProps {
  toasts: Toast[];
  dismiss: (id: string) => void;
}

const variantStyles = {
  default: "bg-popover border-border text-foreground",
  destructive: "bg-card border-destructive/30 text-foreground",
  success: "bg-card border-emerald-500/30 text-foreground",
};

const variantAccent = {
  default: "bg-foreground/30",
  destructive: "bg-destructive",
  success: "bg-emerald-500",
};

const variantIconWrap = {
  default: "bg-foreground/10 text-foreground",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const variantIcons = {
  default: <Info className="w-4 h-4" />,
  destructive: <AlertCircle className="w-4 h-4" />,
  success: <CheckCircle2 className="w-4 h-4" />,
};

function ToastItem({
  toast,
  dismiss,
}: {
  toast: Toast;
  dismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  // Trigger entrance animation on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => dismiss(toast.id), 200);
  };

  const variant = toast.variant ?? "default";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border py-3 pl-4 pr-8 shadow-xl ring-1 ring-black/5 backdrop-blur-md",
        "transition-all duration-300 ease-out",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-2 scale-95",
        variantStyles[variant],
      )}
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-1", variantAccent[variant])}
      />
      <span
        className={cn(
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
          variantIconWrap[variant],
        )}
      >
        {variantIcons[variant]}
      </span>
      <p className="flex-1 pt-0.5 text-sm font-medium leading-snug">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground opacity-60 transition-opacity hover:opacity-100 hover:bg-foreground/5"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Toaster({ toasts, dismiss }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed top-5 right-5 z-[100] flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}
