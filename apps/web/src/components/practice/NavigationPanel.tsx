"use client";

export interface NavItem {
  ordinal: number;
  answered: boolean;
  flagged: boolean;
}

export function NavigationPanel({ items, current, onGo }: { items: NavItem[]; current: number; onGo: (index: number) => void }) {
  const answered = items.filter((i) => i.answered).length;
  const flagged = items.filter((i) => i.flagged).length;
  return (
    <nav aria-label="Question navigation" className="rounded-card border border-border bg-surface p-4">
      <h2 className="text-sm font-bold text-text">Questions</h2>
      <p data-testid="nav-counts" className="mt-1 text-xs text-muted">{`Answered ${answered} · Flagged ${flagged} · Remaining ${items.length - answered}`}</p>
      <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
        {items.map((it, i) => (
          <li key={it.ordinal}>
            <button
              type="button"
              aria-label={`Question ${it.ordinal}, ${it.answered ? "answered" : "not answered"}${it.flagged ? ", flagged" : ""}`}
              aria-current={i === current ? "step" : undefined}
              onClick={() => onGo(i)}
              className={`relative h-9 w-full rounded-control border text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                it.answered ? "border-primary bg-primary text-primary-text" : "border-border bg-surface text-text hover:bg-bg"
              } ${i === current ? "ring-2 ring-primary ring-offset-1" : ""}`}
            >
              {it.ordinal}
              {it.flagged ? <span aria-hidden="true" className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-surface bg-amber-500" /> : null}
            </button>
          </li>
        ))}
      </ul>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
        <div className="flex items-center gap-1"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-primary" />Answered</div>
        <div className="flex items-center gap-1"><span aria-hidden="true" className="h-3 w-3 rounded-full bg-amber-500" />Flagged</div>
        <div className="flex items-center gap-1"><span aria-hidden="true" className="h-3 w-3 rounded-sm border border-border" />Remaining</div>
      </dl>
    </nav>
  );
}
