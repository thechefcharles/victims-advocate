"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ProgramCatalogSelect } from "@/components/programs/ProgramCatalogSelect";
import type { IlVictimAssistanceProgram } from "@/lib/catalog/ilProgramTypes";

/**
 * Create an organization after you have an account. You become org admin.
 * Requires no existing org membership.
 */
export default function OrganizationSignupPage() {
  const router = useRouter();
  const [catalogId, setCatalogId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (catalogId == null) {
      setErr("Please select your organization from the Illinois victim assistance directory.");
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setErr("Please sign in first.");
        return;
      }
      const res = await fetch("/api/org/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ catalog_entry_id: catalogId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Could not create organization"));
        return;
      }
      router.push("/organization/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← Home
        </Link>
        <header>
          <h1 className="text-2xl font-semibold">Register your organization</h1>
          <p className="text-sm text-slate-400 mt-2">
            Sign in, then select your agency from the Illinois Crime Victim Assistance directory.
            You&apos;ll be the organization admin and can invite staff. If you don&apos;t have an
            account yet,{" "}
            <Link href="/signup" className="text-emerald-400 hover:underline">
              create one first
            </Link>
            .
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <ProgramCatalogSelect
            id="org-signup-catalog"
            label="Your organization (directory)"
            required
            value={catalogId}
            onChange={(id: number | null, _p: IlVictimAssistanceProgram | null) => setCatalogId(id)}
          />
          {err && (
            <div className="text-sm text-red-300 border border-red-500/30 rounded-lg px-3 py-2">{err}</div>
          )}
          <button
            type="submit"
            disabled={loading || catalogId == null}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create organization"}
          </button>
        </form>
      </div>
    </main>
  );
}
