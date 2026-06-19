import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function AdminButton({
  variant = "secondary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      {...props}
      className={`admin-button admin-button--${variant} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
