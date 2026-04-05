"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AccountDisabledPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-[var(--color-navy)]">Account disabled</h1>
        <p className="text-sm text-[var(--color-muted)]">
          This account has been disabled. If you believe this is an error, please contact support.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)]"
        >
          Sign out
        </button>
        <p className="text-center">
          <Link href="/login" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
