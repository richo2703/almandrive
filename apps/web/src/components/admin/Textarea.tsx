import type { ReactNode, TextareaHTMLAttributes } from "react";
import { Field } from "./Field";

export function Textarea({
  label,
  hint,
  error,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <textarea {...props} className={`admin-input admin-textarea ${className}`.trim()} />
    </Field>
  );
}
