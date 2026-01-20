// components/intake/IntakeShell.tsx
"use client";

import * as React from "react";
import { StepNav } from "./StepNav";
import type { IntakeStepKey } from "@/lib/intake/steps";

export function IntakeShell({
  caseId,
  step,
  title,
  description,
  children,
  footer,
}: {
  caseId?: string;
  step?: IntakeStepKey;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-2 text-sm text-neutral-600">{description}</p> : null}
      </div>

      <div className="mb-6">
        {/* ✅ PASS PROPS NOW */}
        <StepNav caseId={caseId} currentStep={step} />
      </div>

      <div className="rounded-xl border bg-white p-4">{children}</div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}