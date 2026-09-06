import * as React from "react";
import { X, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Spinner } from "./spinner";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "destructive" | "warning" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "default",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isLoading = false,
  className,
}: ModalProps) {
  // Prevent scrolling behind modal when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getVariantIcon = () => {
    switch (variant) {
      case "destructive":
        return (
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertOctagon className="w-6 h-6" />
          </div>
        );
      case "warning":
        return (
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "info":
        return (
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Info className="w-6 h-6" />
          </div>
        );
      case "success":
        return (
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={isLoading ? undefined : onClose}
        style={{ animation: "fadeInOverlay 0.2s ease" }}
      />

      {/* Dialog Body */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 flex flex-col items-center text-center",
          className,
        )}
        style={{
          animation: "slideUpPrompt 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Close Button */}
        {!isLoading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Top Icon */}
        {getVariantIcon()}

        {/* Text Headers */}
        <div className="space-y-1.5 w-full">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Custom Content Slot */}
        {children && <div className="w-full text-left">{children}</div>}

        {/* Footer actions */}
        <div className="w-full pt-1">
          {footer ? (
            footer
          ) : (
            <div className="flex flex-col sm:flex-row-reverse gap-2">
              {onConfirm && (
                <Button
                  onClick={onConfirm}
                  disabled={isLoading}
                  variant={
                    variant === "destructive" ? "destructive" : "default"
                  }
                  className="w-full sm:flex-1 h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" />
                      Loading...
                    </>
                  ) : (
                    confirmText
                  )}
                </Button>
              )}
              <Button
                onClick={onClose}
                disabled={isLoading}
                variant="outline"
                className="w-full sm:flex-1 h-9 rounded-xl text-sm font-medium"
              >
                {cancelText}
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUpPrompt {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// AlertOctagon icon placeholder helper inside file
function AlertOctagon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
