import { Suspense } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";
import { AdminHeader } from "@/components/AdminHeader";

export const metadata: Metadata = {
  title: "Nudger Admin Panel",
  description: "Platform management for Nudger announcements and configuration",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/nudger-app-icon.png", type: "image/png" },
    ],
    shortcut: "/images/nudger-favicon.ico",
    apple: "/images/nudger-app-icon.png",
  },
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
            <Suspense
              fallback={
                <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md h-16" />
              }
            >
              <AdminHeader />
            </Suspense>
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
