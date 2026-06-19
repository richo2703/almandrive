import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`admin-field ${className}`.trim()}>
      {label ? <span className="admin-label">{label}</span> : null}
      {children}
      {hint ? <small className="admin-help">{hint}</small> : null}
      {error ? <small className="admin-help admin-help--danger">{error}</small> : null}
    </label>
  );
}
