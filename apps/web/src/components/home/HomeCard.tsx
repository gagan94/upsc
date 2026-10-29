import type { ReactNode } from "react";

export function HomeCard({
  id, title, children, dark = false, className = "",
}: { id: string; title: string; children: ReactNode; dark?: boolean; className?: string }) {
  const tone = dark ? "border-sidebar bg-sidebar text-sidebar-text" : "border-border bg-surface text-text";
  return (
    <section aria-labelledby={id} className={`rounded-card border p-4 ${tone} ${className}`}>
      <h2 id={id} className="text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
