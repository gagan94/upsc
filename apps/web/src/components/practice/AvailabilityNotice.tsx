import { Banner } from "@/components/ui/Banner";
import type { PracticeAvailability } from "@/lib/types";

export type AvailabilityState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "no_pyq" }
  | { kind: "ready"; data: PracticeAvailability };

/** Live "12 of 20 requested available" notice under the builder controls. */
export function AvailabilityNotice({ state }: { state: AvailabilityState }) {
  if (state.kind === "idle") return <p className="text-sm text-muted">Pick at least one subject to see how many questions are available.</p>;
  if (state.kind === "loading") return <p className="text-sm text-muted" role="status">Checking availability…</p>;
  if (state.kind === "error") return <Banner tone="warning">We couldn&apos;t check availability. You can still try to start.</Banner>;
  if (state.kind === "no_pyq") return <Banner tone="warning">No verified previous-year questions yet</Banner>;
  const { requested, available } = state.data;
  if (available === 0) return <Banner tone="warning">No questions match this selection. Try other subjects or a different source.</Banner>;
  if (available < requested) return <Banner tone="info">{available} of {requested} requested available</Banner>;
  return <Banner tone="success">All {requested} requested questions available</Banner>;
}
