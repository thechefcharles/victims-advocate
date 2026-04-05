"use client";

import { ArrowRight } from "lucide-react";
import { exitSafelyImmediate } from "@/lib/client/safety/exitSafelyImmediate";
import { useAuth } from "@/components/auth/AuthProvider";
import { ConsentFlowProgress } from "@/components/legal/ConsentFlowProgress";
import type { ConsentFlowStepMeta } from "@/lib/legal/platformLegalConfig";

type Props = {
  steps: ConsentFlowStepMeta[];
  activeStepId: ConsentFlowStepMeta["id"];
  children: React.ReactNode;
};

export function SignupConsentChrome({ steps, activeStepId, children }: Props) {
  const { user, accessToken } = useAuth();

  return (
    <main className="relative min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 pb-16 pt-6 sm:px-6">
      <div className="pointer-events-auto fixed right-4 top-4 z-50 sm:right-6 sm:top-5">
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-medium text-[var(--color-slate)] hover:bg-[var(--color-surface)] hover:text-[var(--color-charcoal)]"
          onClick={() =>
            exitSafelyImmediate({ userId: user?.id ?? null, accessToken: accessToken ?? null })
          }
          aria-label="Exit platform immediately and safely"
        >
          Exit Safely
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        <ConsentFlowProgress steps={steps} activeStepId={activeStepId} />
        {children}
      </div>
    </main>
  );
}
