// components/intake/StepNav.tsx
"use client";

import { useParams, usePathname } from "next/navigation";
import { INTAKE_STEPS } from "@/lib/intake/steps";

export function StepNav() {
  const params = useParams();
  const pathname = usePathname();

  // ✅ Normalize caseId (string | string[] | undefined → string | undefined)
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  // TEMP translation stub
  const t = (k: string) => k;

  // ✅ Guard: if caseId is missing, don’t render links
  if (!caseId) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {INTAKE_STEPS.map((s) => {
        const href = s.path(caseId);
        const active = pathname === href;

        return (
          <a
            key={s.key}
            href={href}
            className={[
              "rounded-full border px-3 py-1 text-sm",
              active
                ? "border-black bg-black text-white"
                : "border-neutral-300 bg-white",
            ].join(" ")}
          >
            {t(s.labelKey)}
          </a>
        );
      })}
    </div>
  );
}