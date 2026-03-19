"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProgramCatalogSelect } from "@/components/programs/ProgramCatalogSelect";
import type { IlVictimAssistanceProgram } from "@/lib/catalog/ilProgramTypes";

/**
 * First-time setup for users who signed up as an organization representative.
 * Creates the org and grants org_admin (same as /signup/organization).
 */
export default function OrganizationSetupPage() {
  const router = useRouter();
  const { orgId, user } = useAuth();
  const [catalogId, setCatalogId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prefilledFromMetadata, setPrefilledFromMetadata] = useState(false);

  useEffect(() => {
    if (orgId) router.replace("/organization/dashboard");
  }, [orgId, router]);

  useEffect(() => {
    if (!user || prefilledFromMetadata) return;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const raw = meta?.pending_org_catalog_entry_id;
    const pendingId =
      typeof raw === "number" && Number.isFinite(raw)
        ? raw
        : typeof raw === "string" && /^\d+$/.test(raw.trim())
          ? parseInt(raw.trim(), 10)
          : null;
    if (pendingId != null) setCatalogId(pendingId);
    setPrefilledFromMetadata(true);
  }, [user, prefilledFromMetadata]);

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

  if (orgId) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-400">Redirecting…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200">
          ← Dashboard
        </Link>
        <header>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-1">
            Organization account
          </p>
          <h1 className="text-2xl font-semibold">Finish creating your organization</h1>
          <p className="text-sm text-slate-400 mt-2">
            Usually this is done during signup. If you were asked to confirm your email first, or
            something went wrong saving your agency, choose your program from the state directory
            here—you&apos;ll be the org admin and can invite staff next.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
        >
          <ProgramCatalogSelect
            id="org-setup-catalog"
            label="Your organization (Illinois victim assistance directory)"
            required
            value={catalogId}
            onChange={(id: number | null, _p: IlVictimAssistanceProgram | null) => setCatalogId(id)}
          />

          {err && (
            <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || catalogId == null}
            className="w-full rounded-lg bg-[#1C8C8C] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create organization"}
          </button>
        </form>
      </div>
    </main>
  );
}
