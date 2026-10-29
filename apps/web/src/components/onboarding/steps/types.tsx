import type { Draft, StepErrors } from "../useOnboarding";

export interface StepProps {
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  errors: StepErrors;
}

export function StepError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-semibold text-danger">{message}</p> : null;
}
