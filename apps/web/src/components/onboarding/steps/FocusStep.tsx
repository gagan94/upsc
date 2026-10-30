import { PAPER_OPTIONS } from "@/lib/prep-options";
import type { PrepPapers, SubjectSummary } from "@/lib/types";
import { Banner } from "@/components/ui/Banner";
import { Chips } from "@/components/ui/Chips";
import type { StepProps } from "./types";
import { StepError, errorProps } from "./types";

export function FocusStep({ draft, setDraft, errors, subjects }: StepProps & { subjects: SubjectSummary[] | null }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Chips label="Papers" options={PAPER_OPTIONS} value={draft.papers} {...errorProps("papers", errors.papers)} onChange={(v) => setDraft({ papers: v as PrepPapers })} />
        <StepError id="papers" message={errors.papers} />
      </div>
      {subjects === null ? (
        <Banner tone="warning">
          We couldn&apos;t load the subject list. You can continue and we will suggest a balanced starter plan.
        </Banner>
      ) : (
        <Chips
          label="Subjects to focus on (optional)"
          multiple
          options={subjects.map((s) => ({ value: s.slug, label: s.title }))}
          value={draft.subjects}
          onChange={(v) => setDraft({ subjects: v })}
        />
      )}
    </div>
  );
}
