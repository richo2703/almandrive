import type { ReactNode } from "react";
import { Input } from "./Input";

export function DateTimePicker({
  label,
  hint,
  error,
  value,
  onChange,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <Input
      type="datetime-local"
      label={label}
      hint={hint}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
