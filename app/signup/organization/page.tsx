"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const ORG_TYPES = [
  { value: "nonprofit", label: "Nonprofit" },
  { value: "hospital", label: "Hospital / health" },
  { value: "gov", label: "Government" },
  { value: "other", label: "Other" },
] as const;

/**
 * Create an organization after you have an account. You become org admin.
 * Requires no existing org membership.
 */
export default function OrganizationSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof ORG_TYPES)[number]["value"]>("nonprofit");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = name.trim();
    if (!n) return;
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
        body: JSON.stringify({ name: n, type }),
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
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← Home
        </Link>
        <header>
          <h1 className="text-2xl font-semibold">Register your organization</h1>
          <p className="text-sm text-slate-400 mt-2">
            Sign in, then create your agency here. You&apos;ll be the organization admin and can invite
            staff. If you don&apos;t have an account yet,{" "}
            <Link href="/signup" className="text-emerald-400 hover:underline">
              create one first
            </Link>
            .
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <label className="block space-y-1">
            <span className="text-[11px] text-slate-400">Organization name</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Chicago Victim Services"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-slate-400">Type</span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as (typeof ORG_TYPES)[number]["value"])}
            >
              {ORG_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {err && (
            <div className="text-sm text-red-300 border border-red-500/30 rounded-lg px-3 py-2">{err}</div>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-lg bg-[#1C8C8C] py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create organization"}
          </button>
        </form>
      </div>
    </main>
  );
}
