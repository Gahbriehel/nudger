import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";
import Link from "next/link";
import { ShieldCheck, Megaphone, LogOut } from "lucide-react";

export const metadata: Metadata = {
  title: "Nudger Admin Panel",
  description: "Platform management for Nudger announcements and configuration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
              <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-6">
                  <Link
                    href="/"
                    className="flex items-center gap-2 font-bold tracking-tight text-primary"
                  >
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <span>Nudger Admin</span>
                  </Link>
                  <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
                    <Link
                      href="/"
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Megaphone className="h-4 w-4" />
                      <span>Announcements</span>
                    </Link>
                  </nav>
                </div>
                <div className="flex items-center gap-3">
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </form>
                </div>
              </div>
            </header>

            <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
              {children}
            </main>
          </div>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
