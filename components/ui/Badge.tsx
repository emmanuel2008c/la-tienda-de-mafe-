import { type HTMLAttributes, type ReactNode } from "react";

export type BadgeVariant = "default" | "primary" | "accent" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
}

export function Badge({
  variant = "default",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    default: "badge",
    primary: "badge badge-primary",
    accent: "badge badge-accent",
    warning: "badge badge-warning",
    danger: "badge badge-danger",
  };

  const dotClass = dot ? "badge-dot" : "";

  return (
    <span className={`${variantClasses[variant]} ${dotClass} ${className}`} {...props}>
      {children}
    </span>
  );
}
