import { Suspense } from "react";

export default function SignupConsentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
          <p className="text-sm text-[var(--color-muted)]">Loading…</p>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
