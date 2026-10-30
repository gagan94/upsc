"use client";

import { useRef } from "react";
import type { OptionKey, QuestionOption } from "@/lib/types";

export function OptionList({
  options,
  selected,
  disabled,
  correctOption,
  onSelect,
  onBlur,
}: {
  options: QuestionOption[];
  selected: OptionKey | null;
  /** Locked (learning mode, already checked). */
  disabled: boolean;
  /** Only passed once feedback is legitimately available (learning mode, after Check). */
  correctOption?: OptionKey;
  onSelect: (key: OptionKey) => void;
  onBlur: () => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIdx = options.findIndex((o) => o.key === selected);
  const tabbable = selectedIdx >= 0 ? selectedIdx : 0;

  function arrow(e: React.KeyboardEvent, from: number) {
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!delta || disabled) return;
    e.preventDefault();
    const next = (from + delta + options.length) % options.length;
    onSelect(options[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Answer options"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onBlur();
      }}
      className="flex flex-col gap-2"
    >
      {options.map((o, i) => {
        const on = o.key === selected;
        const isCorrect = correctOption === o.key;
        const tag = isCorrect ? "Correct" : on && correctOption ? "Your answer" : null;
        return (
          <button
            key={o.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            tabIndex={i === tabbable ? 0 : -1}
            onClick={() => onSelect(o.key)}
            onKeyDown={(e) => arrow(e, i)}
            className={`flex items-start gap-3 rounded-card border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default ${
              isCorrect ? "border-primary bg-surface" : on ? "border-primary bg-surface ring-1 ring-primary" : "border-border bg-surface hover:bg-bg"
            }`}
          >
            <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${on ? "border-primary bg-primary text-primary-text" : "border-border text-muted"}`}>
              {o.key}
            </span>
            <span className="sr-only">{o.key}. </span>
            <span className="flex-1 text-text">{o.text}</span>
            {tag ? <span className="shrink-0 text-xs font-bold text-primary">{tag}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
