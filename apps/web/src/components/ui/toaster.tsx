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
  destructive:
    "bg-destructive/10 border-destructive/30 text-destructive dark:bg-destructive/20",
  success:
    "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
};

const variantIcons = {
  default: <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />,
  destructive: (
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-destructive" />
  ),
  success: (
    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
  ),
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
    setTimeout(() => dismiss(toast.id), 300);
  };

  const variant = toast.variant ?? "default";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex items-start gap-3 w-full max-w-sm rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        variantStyles[variant],
      )}
    >
      {variantIcons[variant]}
      <p className="text-sm font-medium leading-snug flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
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
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}
