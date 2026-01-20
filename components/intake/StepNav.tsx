// components/intake/StepNav.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { INTAKE_STEPS, type IntakeStepKey } from "@/lib/intake/steps";
import { useI18n } from "@/components/i18n/i18nProvider";

export function StepNav({
  caseId,
  currentStep,
}: {
  caseId?: string;
  currentStep?: IntakeStepKey;
}) {
  const { t } = useI18n();

  // Fallback: if parent didn't pass caseId, try URL
  const params = useParams();
  const raw = (params as any)?.caseId;
  const cid: string | undefined = caseId ?? (Array.isArray(raw) ? raw[0] : raw);

  if (!cid) return null;

  return (
    <nav aria-label={t("intake.steps.victim") /* any stable label */}>
      <div className="flex flex-wrap gap-2">
        {INTAKE_STEPS.map((s) => {
          const isActive = currentStep === s.key;

          return (
            <Link
              key={s.key}
              href={s.path(cid)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition",
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
              ].join(" ")}
            >
              {t(s.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}