"use client";

import { useRef } from "react";

export interface ChipOption {
  value: string;
  label: string;
}

type Base = { label: string; options: ChipOption[]; className?: string };
export type ChipsProps =
  | (Base & { multiple?: false; value: string | null; onChange: (value: string) => void })
  | (Base & { multiple: true; value: string[]; onChange: (value: string[]) => void });

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
    on ? "border-primary bg-primary text-primary-text" : "border-border bg-surface text-text hover:bg-bg"
  }`;

/** Single choice (radio group, arrow keys) or multiple choice (toggle buttons). */
export function Chips(props: ChipsProps) {
  const { label, options, className = "" } = props;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (props.multiple) {
    const { value, onChange } = props;
    return (
      <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              className={chip(on)}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  const { value, onChange } = props;
  const selectedIdx = options.findIndex((o) => o.value === value);
  const tabbable = selectedIdx >= 0 ? selectedIdx : 0;
  function move(from: number, delta: number) {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }
  return (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o, i) => {
        const on = i === selectedIdx;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === tabbable ? 0 : -1}
            className={chip(on)}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
