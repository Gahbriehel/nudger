import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GUIDE_SECTIONS, QUICK_START } from "@/lib/guide";
import { ReplayTourButton } from "@/components/dashboard/ReplayTourButton";

export const metadata = { title: "How Nudger works · Nudger" };

export default function GuidePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            How Nudger works
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nudger remembers things so you don&apos;t have to. Here&apos;s
            everything it can do.
          </p>
        </div>
        <ReplayTourButton />
      </div>

      {/* Quick start */}
      <section
        aria-labelledby="quick-start"
        className="border border-border bg-card p-5 rounded-2xl shadow-sm space-y-4"
      >
        <h2
          id="quick-start"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          Quick start
        </h2>
        <ol className="space-y-4">
          {QUICK_START.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="w-7 h-7 shrink-0 rounded-full bg-foreground text-background text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Jump links */}
      <nav aria-label="Guide sections" className="flex flex-wrap gap-2">
        {GUIDE_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="h-9 px-3 inline-flex items-center rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground hover:text-foreground active:bg-muted"
          >
            {s.title}
          </a>
        ))}
      </nav>

      {GUIDE_SECTIONS.map(
        ({ id, title, icon: Icon, summary, points, link }) => (
          <section
            key={id}
            id={id}
            aria-labelledby={`${id}-title`}
            // Leave room for the sticky header when jumping to an anchor
            className="scroll-mt-20 border border-border bg-card p-5 rounded-2xl shadow-sm space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-brand-indigo/10 text-brand-indigo">
                <Icon className="w-5 h-5" />
              </span>
              <h2
                id={`${id}-title`}
                className="text-lg font-bold tracking-tight text-foreground"
              >
                {title}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">{summary}</p>
            <ul className="space-y-2 list-disc pl-5 marker:text-muted-foreground">
              {points.map((p) => (
                <li key={p} className="text-sm text-foreground leading-relaxed">
                  {p}
                </li>
              ))}
            </ul>
            {link && (
              <Link
                href={link.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-indigo pt-1"
              >
                {link.label} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </section>
        ),
      )}
    </div>
  );
}
