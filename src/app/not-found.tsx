import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 – Page Not Found | Nudger",
  description: "Oops! The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Ambient background orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "70vw",
            height: "50vh",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(57,73,171,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
            animation: "orbFloat 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-5%",
            left: "-10%",
            width: "50vw",
            height: "40vh",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(33,150,243,0.12) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "orbFloat 10s ease-in-out infinite reverse",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "-5%",
            width: "35vw",
            height: "35vh",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(126,87,194,0.10) 0%, transparent 70%)",
            filter: "blur(45px)",
            animation: "orbFloat 12s ease-in-out infinite",
          }}
        />
      </div>

      {/* Subtle grid overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(57,73,171,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(57,73,171,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-md w-full">
        {/* Bouncing task icon */}
        <div
          style={{ animation: "iconBounce 2.4s ease-in-out infinite" }}
          className="w-20 h-20 rounded-3xl bg-card border border-border shadow-xl flex items-center justify-center"
        >
          <svg
            className="w-10 h-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>

        {/* 404 number */}
        <div className="relative select-none">
          <span
            className="text-[8rem] sm:text-[10rem] font-black leading-none tracking-tighter brand-gradient-text"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            aria-label="404"
          >
            404
          </span>
          {/* glitch layer */}
          <span
            aria-hidden="true"
            className="absolute inset-0 text-[8rem] sm:text-[10rem] font-black leading-none tracking-tighter brand-gradient-text opacity-0"
            style={{
              fontFamily: "var(--font-poppins), sans-serif",
              animation: "glitch 4s steps(1) infinite",
            }}
          >
            404
          </span>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Looks like this task got lost in the backlog.
            <br />
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Back to Dashboard
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-card border border-border text-foreground text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-muted/60 active:scale-95 transition-all"
          >
            Sign in
          </Link>
        </div>

        {/* Tip */}
        <p className="text-[11px] text-muted-foreground/60 pt-2">
          Error code: <span className="font-mono">HTTP 404 Not Found</span>
        </p>
      </div>

      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50% { transform: translateX(-50%) translateY(-20px); }
        }
        @keyframes iconBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glitch {
          0%   { opacity: 0; clip-path: inset(0 0 100% 0); }
          5%   { opacity: 0.6; clip-path: inset(30% 0 55% 0); transform: translate(-3px, 0); }
          6%   { opacity: 0; }
          45%  { opacity: 0; clip-path: inset(0 0 100% 0); }
          50%  { opacity: 0.5; clip-path: inset(60% 0 10% 0); transform: translate(3px, 0); }
          51%  { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
