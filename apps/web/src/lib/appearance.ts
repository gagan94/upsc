export type Theme = "light" | "dark" | "system";
export type TextSize = "100" | "112" | "125";
export interface Appearance {
  theme: Theme;
  textSize: TextSize;
  highContrast: boolean;
  reducedMotion: boolean;
}

export const APPEARANCE_KEY = "upsc.appearance";
export const APPEARANCE_EVENT = "upsc:appearance";
export const DEFAULT_APPEARANCE: Appearance = {
  theme: "light",
  textSize: "100",
  highContrast: false,
  reducedMotion: false,
};

const THEMES: Theme[] = ["light", "dark", "system"];
const SIZES: TextSize[] = ["100", "112", "125"];

/** Browser-local only. Any storage failure or invalid value falls back to the defaults. */
export function readAppearance(): Appearance {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const v = JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>;
    return {
      theme: THEMES.includes(v.theme as Theme) ? (v.theme as Theme) : DEFAULT_APPEARANCE.theme,
      textSize: SIZES.includes(v.textSize as TextSize) ? (v.textSize as TextSize) : DEFAULT_APPEARANCE.textSize,
      highContrast: v.highContrast === true,
      reducedMotion: v.reducedMotion === true,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearance(a: Appearance): void {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(a));
  } catch {
    // Storage unavailable (private mode, blocked): the setting still applies for this page view.
  }
}

export function prefersDark(): boolean {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/** Reflect the settings as attributes on <html>; tokens.css keys off them. */
export function applyAppearance(a: Appearance, root: HTMLElement = document.documentElement): void {
  root.setAttribute("data-theme", a.theme === "system" ? (prefersDark() ? "dark" : "light") : a.theme);
  root.setAttribute("data-text-size", a.textSize);
  if (a.highContrast) root.setAttribute("data-contrast", "high");
  else root.removeAttribute("data-contrast");
  if (a.reducedMotion) root.setAttribute("data-motion", "reduced");
  else root.removeAttribute("data-motion");
}
