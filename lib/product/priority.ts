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
      return "border-amber-500/35 bg-amber-950/25 text-amber-100/90";
    case "medium":
      return "border-sky-500/30 bg-sky-950/20 text-sky-100/85";
    case "low":
      return "border-slate-600/80 bg-slate-900/50 text-slate-400";
    default:
      return "border-slate-700 bg-slate-900/40 text-slate-400";
  }
}

export function priorityRingClassName(p: ProductPriority): string {
  switch (p) {
    case "high":
      return "ring-1 ring-amber-500/25";
    case "medium":
      return "ring-1 ring-sky-500/20";
    case "low":
      return "ring-1 ring-slate-700/60";
    default:
      return "";
  }
}
