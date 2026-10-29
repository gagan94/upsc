import { SUPPORT_OPTIONS } from "@/lib/prep-options";
import { Chips } from "@/components/ui/Chips";
import type { StepProps } from "./types";

export function SupportStep({ draft, setDraft }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Pick anything that would help. This is optional and you can change it later.</p>
      <Chips label="What support would help most?" multiple options={SUPPORT_OPTIONS} value={draft.support} onChange={(v) => setDraft({ support: v })} />
    </div>
  );
}
