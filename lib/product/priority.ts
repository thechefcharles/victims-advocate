/**
 * Subtle priority labels for next-action and queue UI (Phase 10).
 * Deterministic — no randomness.
 */

export type ProductPriority = "high" | "medium" | "low";

export function priorityLabel(p: ProductPriority): string {
  switch (p) {
    case "high":
      return "High priority";
    case "medium":
      return "Medium priority";
    case "low":
      return "Low priority";
    default:
      return "";
  }
}

/** Muted chip / border styling — keep calm, not alarmist */
export function priorityBadgeClassName(p: ProductPriority): string {
  switch (p) {
    case "high":
      return "border-[var(--color-warning)]/40 bg-[var(--color-gold-light)] text-[var(--color-charcoal)]";
    case "medium":
      return "border-[var(--color-teal)]/35 bg-[var(--color-teal-light)] text-[var(--color-teal-deep)]";
    case "low":
      return "border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 text-[var(--color-muted)]";
    default:
      return "border-[var(--color-border)] bg-[var(--color-warm-cream)]/75 text-[var(--color-muted)]";
  }
}

export function priorityRingClassName(p: ProductPriority): string {
  switch (p) {
    case "high":
      return "ring-1 ring-amber-500/25";
    case "medium":
      return "ring-1 ring-sky-500/20";
    case "low":
      return "ring-1 ring-[var(--color-border)]";
    default:
      return "";
  }
}
