import type { SignalCompleteness, SignalConfidence } from "./types";

export function toIsoOrNull(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function daysBetween(olderIso: string, newerIso: string): number | null {
  const a = Date.parse(olderIso);
  const b = Date.parse(newerIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return (b - a) / 86400000;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((acc, n) => acc + n, 0);
  return total / values.length;
}

export function clampRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  const v = numerator / denominator;
  return Math.max(0, Math.min(1, v));
}

export function profileCompletenessBucket(params: {
  serviceTypesCount: number;
  languagesCount: number;
  hasCoverage: boolean;
  hasCapacity: boolean;
  hasIntakeMethods: boolean;
}): SignalCompleteness {
  let score = 0;
  if (params.serviceTypesCount > 0) score++;
  if (params.languagesCount > 0) score++;
  if (params.hasCoverage) score++;
  if (params.hasCapacity) score++;
  if (params.hasIntakeMethods) score++;

  if (score <= 1) return "minimal";
  if (score <= 3) return "partial";
  return "complete";
}

export function replyConfidence(sampleSize: number): SignalConfidence {
  if (sampleSize >= 10) return "high";
  if (sampleSize >= 3) return "medium";
  return "low";
}

