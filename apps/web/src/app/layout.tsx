import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Nudger",
  description:
    "Productivity system for tracking tasks, subtasks, recurrence rules, and cognitive memory cues.",
  icons: {
    icon: "/images/nudger-app-icon.png",
    shortcut: "/images/nudger-app-icon.png",
    apple: "/images/nudger-app-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nudger",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  // Draw edge-to-edge (needed with the iOS "black-translucent" status bar);
  // layouts pad themselves with env(safe-area-inset-*).
  viewportFit: "cover",
};

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${inter.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Bottom placement keeps toasts off the header/nav; on phones sonner
              renders them full-width, lifted clear of the iOS home indicator. */}
          <Toaster
            richColors
            closeButton
            position="bottom-right"
            visibleToasts={3}
            duration={3000}
            toastOptions={{
              classNames: {
                // Default action button is solid black; match the toast's
                // own tone instead (e.g. green text on the green success toast)
                actionButton:
                  "!h-8 !px-3 !rounded-lg !text-[13px] !font-semibold !bg-white/80 !text-current !border !border-black/10 hover:!bg-white dark:!bg-white/10 dark:!border-white/15 dark:hover:!bg-white/20",
              },
            }}
            mobileOffset={{
              // clear the mobile bottom tab bar (4rem) as well
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem + 16px)",
            }}
          />
          <ServiceWorkerRegister />
          <AnnouncementModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
