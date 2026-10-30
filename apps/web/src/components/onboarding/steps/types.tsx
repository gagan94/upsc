import type { Draft, StepErrors } from "../useOnboarding";

export interface StepProps {
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  errors: StepErrors;
}

export const stepErrorId = (key: string) => `step-error-${key}`;

/** Spreads onto a Chips group so the error is announced and linked to it. */
export function errorProps(key: string, message?: string) {
  return message ? { describedBy: stepErrorId(key), invalid: true } : {};
}

export function StepError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={stepErrorId(id)} role="alert" className="text-xs font-semibold text-danger">
      {message}
    </p>
  ) : null;
}
