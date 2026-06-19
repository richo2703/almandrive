import type { InputHTMLAttributes, ReactNode } from "react";
import { Field } from "./Field";

export function Input({
  label,
  hint,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <input {...props} className={`admin-input ${className}`.trim()} />
    </Field>
  );
}
