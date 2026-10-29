"use client";

import { useState } from "react";
import {
  APPEARANCE_EVENT,
  applyAppearance,
  readAppearance,
  writeAppearance,
  type Appearance,
  type TextSize,
  type Theme,
} from "@/lib/appearance";
import { Chips } from "@/components/ui/Chips";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match my device" },
];
const SIZE_OPTIONS = [
  { value: "100", label: "100%" },
  { value: "112", label: "112%" },
  { value: "125", label: "125%" },
];

const toggleClass = "flex items-start gap-3 text-sm text-text";

/** Browser-local settings: saved on change, no Save button and no API call. */
export function AppearanceForm() {
  const [a, setA] = useState<Appearance>(() => readAppearance());

  function update(next: Appearance) {
    setA(next);
    writeAppearance(next);
    applyAppearance(next);
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <p className="text-sm text-muted">These settings are saved in this browser only and apply immediately.</p>
      <Chips label="Theme" options={THEME_OPTIONS} value={a.theme} onChange={(v) => update({ ...a, theme: v as Theme })} />
      <Chips label="Text size" options={SIZE_OPTIONS} value={a.textSize} onChange={(v) => update({ ...a, textSize: v as TextSize })} />
      <label className={toggleClass}>
        <input type="checkbox" className="mt-0.5" checked={a.highContrast} onChange={(e) => update({ ...a, highContrast: e.target.checked })} />
        <span>
          <span className="block font-semibold">High contrast</span>
          <span className="block text-xs text-muted">Stronger text and border colours.</span>
        </span>
      </label>
      <label className={toggleClass}>
        <input type="checkbox" className="mt-0.5" checked={a.reducedMotion} onChange={(e) => update({ ...a, reducedMotion: e.target.checked })} />
        <span>
          <span className="block font-semibold">Reduce motion</span>
          <span className="block text-xs text-muted">Turns off animations and transitions.</span>
        </span>
      </label>
    </div>
  );
}
