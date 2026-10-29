import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import { controlClass } from "./Field";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string | null;
}

export function Select({
  label,
  options,
  hint,
  error,
  className = "",
  id: idProp,
  "aria-describedby": callerDescribedBy,
  ...rest
}: SelectProps) {
  const uid = useId();
  const id = idProp ?? `${uid}-select`;
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const describedBy = [callerDescribedBy, hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      <select
        {...rest}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`${controlClass} ${className}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
