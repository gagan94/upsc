import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";

export const controlClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-[invalid=true]:border-danger-border";

type Shared = { label: string; hint?: string; error?: string | null };
export type FieldProps =
  | (Shared & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
  | (Shared & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>);

/** Labelled text input/textarea. Hint and error are linked through aria-describedby. */
export function Field(props: FieldProps) {
  const { label, hint, error, multiline, className = "", ...rest } = props;
  const uid = useId();
  const id = (rest as { id?: string }).id ?? `${uid}-field`;
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const callerDescribedBy = (rest as { "aria-describedby"?: string })["aria-describedby"];
  const describedBy =
    [callerDescribedBy, hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? (true as const) : undefined,
    className: `${controlClass} ${className}`,
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      {multiline ? (
        <textarea {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...common} />
      ) : (
        <input {...(rest as InputHTMLAttributes<HTMLInputElement>)} {...common} />
      )}
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
