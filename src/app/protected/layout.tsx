import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-border h-16 bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"} className="text-foreground font-bold flex items-center gap-2 select-none">
              Task Memory
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
              <LogoutButton />
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5 w-full">
          {children}
        </div>
      </div>
    </main>
  );
}
