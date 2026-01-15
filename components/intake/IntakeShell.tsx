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
  // ✅ NEW: allow pages to pass these (even if StepNav doesn't use them yet)
  caseId?: string;
  step?: IntakeStepKey;

  title: string;
  description?: string;
  children: React.ReactNode;

  // ✅ NEW: optional footer area for Save / Continue buttons
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>

      <div className="mb-6">
        {/* ✅ We are NOT passing props to StepNav yet,
            because your StepNav component currently takes no props. */}
        <StepNav />
      </div>

      <div className="rounded-xl border bg-white p-4">{children}</div>

      {/* ✅ Footer (buttons) */}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}