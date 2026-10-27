import type { ReactNode } from "react";

export function AuthCard({ title, helper, children }: { title: string; helper?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-bg md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-text md:flex">
        <span className="text-lg font-bold text-sidebar-active-text">AI UPSC</span>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-surface">
            Your preparation, one connected workspace.
          </h2>
          <p className="mt-4 text-base">
            Read and learn. Capture useful notes. Revise, practise and plan your next step.
          </p>
        </div>
        <p className="text-[11px]">AI UPSC · Study platform</p>
      </section>
      <section className="flex flex-col items-center justify-center p-4">
        <span className="mb-4 self-start text-lg font-bold text-primary md:hidden">AI UPSC</span>
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-8">
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          {helper ? <p className="mt-2 text-sm text-muted">{helper}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}

export const inputClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
export const primaryButtonClass =
  "w-full rounded-control bg-primary px-4 py-2 font-semibold text-primary-text disabled:opacity-60";
export const secondaryButtonClass =
  "w-full rounded-control border border-border bg-surface px-4 py-2 font-semibold text-text disabled:opacity-60";

export function FormError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="rounded-control border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}
