import type { ReactNode } from "react";
import { Check } from "lucide-react";

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange(value: boolean): void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="admin-checkbox">
      <button
        type="button"
        className={`admin-checkbox__box ${checked ? "is-checked" : ""}`}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
      >
        {checked ? <Check size={14} /> : null}
      </button>
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}
