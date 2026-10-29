import { ATTEMPT_OPTIONS, STAGE_OPTIONS, TARGET_YEAR_OPTIONS } from "@/lib/prep-options";
import type { PrepStage } from "@/lib/types";
import { Chips } from "@/components/ui/Chips";
import { Select } from "@/components/ui/Select";
import type { StepProps } from "./types";
import { StepError } from "./types";

export function PreparationStep({ draft, setDraft, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Chips label="Target year" options={TARGET_YEAR_OPTIONS} value={draft.targetYear} onChange={(v) => setDraft({ targetYear: v })} />
        <StepError message={errors.targetYear} />
      </div>
      <div className="flex flex-col gap-1">
        <Chips label="Where are you in your preparation?" options={STAGE_OPTIONS} value={draft.stage} onChange={(v) => setDraft({ stage: v as PrepStage })} />
        <StepError message={errors.stage} />
      </div>
      <Select
        label="Attempt (optional)"
        value={draft.attempt}
        onChange={(e) => setDraft({ attempt: e.target.value })}
        options={[{ value: "", label: "Not set" }, ...ATTEMPT_OPTIONS]}
      />
    </div>
  );
}
