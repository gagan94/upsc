import type { ReactNode } from "react";

const TONES = {
  error: "border-danger-border bg-danger-bg text-danger",
  warning: "border-border bg-bg text-text",
  info: "border-border bg-surface text-text",
  success: "border-primary bg-surface text-primary",
} as const;

export function Banner({
  tone = "info",
  children,
  className = "",
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={`rounded-card border px-4 py-3 text-sm ${TONES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
