"use client";

import { useEffect } from "react";
import { APPEARANCE_EVENT, applyAppearance, readAppearance } from "@/lib/appearance";

/** Applies the browser-local appearance settings to <html>. Mounted once in the root layout. */
export function AppearanceApplier() {
  useEffect(() => {
    const apply = () => applyAppearance(readAppearance());
    apply();
    window.addEventListener(APPEARANCE_EVENT, apply);
    window.addEventListener("storage", apply);
    let mq: MediaQueryList | null = null;
    try {
      mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
      mq?.addEventListener?.("change", apply);
    } catch {
      mq = null;
    }
    return () => {
      window.removeEventListener(APPEARANCE_EVENT, apply);
      window.removeEventListener("storage", apply);
      mq?.removeEventListener?.("change", apply);
    };
  }, []);
  return null;
}
