"use client";

import Link from "next/link";
import { type HTMLAttributes, type ReactNode } from "react";

export type CardVariant = "default" | "soft" | "interactive" | "selected" | "warning" | "danger";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ReactNode;
}

export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const variantClasses: Record<CardVariant, string> = {
    default: "card",
    soft: "card card-soft",
    interactive: "card card-interactive",
    selected: "card card-selected",
    warning: "card border-warning/50 bg-warning-light/40",
    danger: "card border-danger/40 bg-danger-light/50",
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-border pb-3 ${className}`}>
      <div>
        {eyebrow && <span className="eyebrow block mb-0.5">{eyebrow}</span>}
        {title && <h3 className="text-lg sm:text-xl font-serif font-bold text-ink">{title}</h3>}
        {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {children}
    </div>
  );
}

export function CardBody({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

export function CardFooter({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`border-t border-border pt-3 mt-3 flex items-center justify-between gap-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Tarjeta de métrica / KPI altamente reutilizable.
 */
export function StatCard({
  title,
  value,
  description,
  href,
  badge,
  tone = "default",
  loading = false,
  className = "",
  onClick,
}: {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  href?: string;
  badge?: string;
  tone?: "default" | "primary" | "warning" | "danger" | "accent";
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const toneValueClasses: Record<string, string> = {
    default: "text-ink",
    primary: "text-primary",
    warning: "text-warning",
    danger: "text-danger",
    accent: "text-accent",
  };

  const isInteractive = Boolean(href || onClick);

  const content = (
    <Card
      variant={isInteractive ? "interactive" : tone === "warning" && badge ? "warning" : "default"}
      className={`p-5 space-y-1.5 h-full flex flex-col justify-between ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
          {title}
        </span>
        {badge && (
          <span
            className={`badge text-[10px] ${
              tone === "warning"
                ? "badge-warning"
                : tone === "danger"
                ? "badge-danger"
                : "badge-primary"
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className={`text-2xl sm:text-3xl font-serif font-bold ${toneValueClasses[tone]}`}>
        {loading ? "—" : value}
      </div>

      {description && (
        <div className="text-xs text-ink-muted flex items-center justify-between pt-0.5">
          <span>{description}</span>
          {isInteractive && (
            <span className="text-primary text-[11px] font-semibold ml-1">→</span>
          )}
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block group h-full">
        {content}
      </Link>
    );
  }

  return content;
}
