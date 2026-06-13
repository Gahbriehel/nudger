import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Spinner({ className, size = "md", label, ...props }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5">
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-indigo dark:border-brand-indigo/30 dark:border-t-brand-blue",
          {
            "w-4 h-4 border-[1.5px]": size === "sm",
            "w-8 h-8": size === "md",
            "w-12 h-12 border-[3px]": size === "lg",
          },
          className
        )}
        {...props}
      />
      {label && (
        <span
          className={cn(
            "text-muted-foreground font-semibold animate-pulse tracking-wide select-none font-poppins",
            {
              "text-[10px]": size === "sm",
              "text-xs": size === "md",
              "text-sm": size === "lg",
            }
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
