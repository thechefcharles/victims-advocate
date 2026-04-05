"use client";

import type { ConsentFlowStepMeta } from "@/lib/legal/platformLegalConfig";
import { getConsentProgressStepCount } from "@/lib/legal/platformLegalConfig";

type Props = {
  steps: ConsentFlowStepMeta[];
  /** Matches `step.id` of the active screen */
  activeStepId: ConsentFlowStepMeta["id"];
};

export function ConsentFlowProgress({ steps, activeStepId }: Props) {
  const total = getConsentProgressStepCount();

  return (
    <nav
      className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/60 px-4 py-3"
      aria-label={`Consent progress, ${total} steps`}
    >
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        {steps.map((s) => {
          const isCurrent = s.id === activeStepId;
          return (
            <li
              key={s.id}
              className={`text-sm ${isCurrent ? "font-semibold text-[var(--color-navy)]" : "text-[var(--color-slate)]"}`}
            >
              <span className="sr-only">
                {isCurrent ? "Current step: " : "Step "}
              </span>
              <span aria-current={isCurrent ? "step" : undefined}>
                Step {s.stepNumber} of {total} — {s.label}
                {isCurrent ? " (active — current)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
