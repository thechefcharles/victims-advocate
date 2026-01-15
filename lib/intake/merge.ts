// lib/intake/merge.ts
export function deepMerge<T>(base: T, patch: any): T {
  if (patch == null) return base;
  if (Array.isArray(patch)) return patch as any;
  if (typeof patch !== "object") return patch as any;

  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const key of Object.keys(patch)) {
    const b = (base as any)?.[key];
    const p = patch[key];
    if (p && typeof p === "object" && !Array.isArray(p)) out[key] = deepMerge(b ?? {}, p);
    else out[key] = p;
  }
  return out;
}