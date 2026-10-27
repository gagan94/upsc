import type { NavItem } from "@/lib/nav";

export function StubPage({ item, extra }: { item: NavItem; extra?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">{item.label}</h1>
        <p className="mt-1 text-sm text-muted">Arrives in Phase {item.phase}</p>
        {extra ? <p className="mt-1 text-sm text-text">{extra}</p> : null}
        {item.figmaNode ? <p className="mt-1 text-[11px] text-muted">Figma node {item.figmaNode}</p> : null}
      </div>
      <section
        aria-labelledby="sample-data-heading"
        className="rounded-card border border-border bg-surface p-4"
      >
        <h2 id="sample-data-heading" className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Sample data
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-text">
          <li>Placeholder item one</li>
          <li>Placeholder item two</li>
          <li>Placeholder item three</li>
        </ul>
      </section>
    </div>
  );
}
