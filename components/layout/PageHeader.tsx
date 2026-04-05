"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type PageHeaderProps = {
  /** Small uppercase label above the title (e.g. “Platform admin”) */
  eyebrow?: string;
  /** One-line context: “Admin → Cases”, “My Dashboard → Case” */
  contextLine?: string;
  title: string;
  /** Override default h1 sizing (e.g. calmer dashboards) */
  titleClassName?: string;
  subtitle?: ReactNode;
  /** Extra line under subtitle (links, hints) */
  meta?: ReactNode;
  backLink?: { href: string; label: string };
  rightActions?: ReactNode;
  className?: string;
};

/**
 * Shared page header — consistent title, subtitle, and action placement (Phase 9).
 * UI-only; no data fetching.
 */
export function PageHeader({
  eyebrow,
  contextLine,
  title,
  titleClassName = "text-2xl sm:text-3xl font-bold text-[var(--color-navy)]",
  subtitle,
  meta,
  backLink,
  rightActions,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`space-y-2 ${className}`}>
      {backLink && (
        <Link
          href={backLink.href}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-charcoal)] mb-1 inline-block"
        >
          {backLink.label}
        </Link>
      )}
      {contextLine && (
        <p className="text-[11px] text-[var(--color-muted)] tracking-wide">{contextLine}</p>
      )}
      {eyebrow && (
        <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">{eyebrow}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className={titleClassName}>{title}</h1>
          {subtitle != null && subtitle !== "" && (
            <div className="text-sm text-[var(--color-muted)] max-w-2xl leading-relaxed">{subtitle}</div>
          )}
          {meta != null && meta !== "" && (
            <div className="text-[11px] text-[var(--color-muted)] max-w-2xl">{meta}</div>
          )}
        </div>
        {rightActions ? (
          <div className="flex flex-wrap gap-2 shrink-0 justify-start sm:justify-end items-center">
            {rightActions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
