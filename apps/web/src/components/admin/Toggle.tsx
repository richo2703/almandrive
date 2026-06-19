export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange(value: boolean): void;
  label: string;
}) {
  return (
    <label className="admin-toggle">
      <span>{label}</span>
      <button
        type="button"
        className={`admin-toggle__control ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span />
      </button>
    </label>
  );
}
