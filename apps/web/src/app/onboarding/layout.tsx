import type { ReactNode } from "react";

/** Minimal chrome for first-run setup: no sidebar or top bar. */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-3">
          <span className="text-lg font-bold text-primary">AI UPSC</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-card border border-border bg-surface p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
