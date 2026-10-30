import type { QuestionStatus, VerificationStatus } from "@/lib/types";

const STATUS: Record<QuestionStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "border-border bg-bg text-muted" },
  published: { label: "Published", cls: "border-primary bg-surface text-primary" },
  retired: { label: "Retired", cls: "border-danger-border bg-danger-bg text-danger" },
};
const VERIFICATION: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  verified: "Verified",
  platform_sample: "Sample question",
};

const base = "inline-block rounded-control border px-2 py-0.5 text-xs font-semibold";

export function StatusBadge({ status }: { status: QuestionStatus }) {
  const s = STATUS[status];
  return <span className={`${base} ${s.cls}`}>{s.label}</span>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <span className={`${base} border-border bg-bg text-text`}>{VERIFICATION[status]}</span>;
}
