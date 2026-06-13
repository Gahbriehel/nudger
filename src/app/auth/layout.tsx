import { ThemeSwitcher } from "@/components/theme-switcher";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* Theme switcher in top corner */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
          {/* Logo & Description */}
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="flex items-center gap-2 select-none">
              <Image
                width={140}
                height={140}
                src="/images/nudger-logo-black.svg"
                alt="Nudger"
                className="dark:hidden block"
                priority
              />
              <Image
                width={140}
                height={140}
                src="/images/nudger-logo-white.svg"
                alt="Nudger"
                className="hidden dark:block"
                priority
              />
            </Link>
            <p className="text-xs text-muted-foreground mt-2 max-w-[280px] leading-relaxed">
              Productivity system for tracking tasks, subtasks, recurrence
              rules, and cognitive memory cues.
            </p>
          </div>

          {/* Form Content */}
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
