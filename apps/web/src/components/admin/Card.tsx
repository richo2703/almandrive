import type { ReactNode } from "react";

export function AdminCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-card ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <header className="admin-card__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="admin-card__actions">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
