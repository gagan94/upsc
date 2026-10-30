import type { OptionKey, QuestionReview } from "@/lib/types";

const KEYS: OptionKey[] = ["A", "B", "C", "D"];

export function OthersAnswered({ data }: { data: QuestionReview["othersAnswered"] }) {
  const pct = data.pctByOption;
  return (
    <section aria-labelledby="others-h" className="flex flex-col gap-2">
      <h2 id="others-h" className="text-base font-bold text-text">How others answered</h2>
      {pct === null ? (
        <p className="text-sm text-muted">Not enough data yet</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {KEYS.map((k) => (
            <li key={k} className="flex items-center gap-3 text-sm text-text">
              <span className="w-12 shrink-0 font-semibold">Option {k}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-bg">
                <span data-testid={`others-bar-${k}`} className="block h-full rounded-full bg-primary" style={{ width: `${pct[k]}%` }} />
              </span>
              <span className="w-14 shrink-0 text-right tabular-nums">{pct[k]}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
