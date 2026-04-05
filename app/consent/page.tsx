"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type PolicyDetail = {
  id: string;
  doc_type: string;
  version: string;
  title: string;
  content: string;
  workflow_key: string | null;
};

function ConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflowKey = searchParams.get("workflow") ?? null;

  const [missing, setMissing] = useState<PolicyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }
      const params = workflowKey ? `?workflow_key=${encodeURIComponent(workflowKey)}` : "";
      const res = await fetch(`/api/policies/active${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const json = await res.json();
      const details = json.data?.missing_details ?? [];
      setMissing(details);
      setLoading(false);
    };
    run();
  }, [router, workflowKey]);

  const handleAcceptAll = async () => {
    if (missing.length === 0) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/policies/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          policy_ids: missing.map((m) => m.id),
          workflow_key: workflowKey,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to record acceptance"));
        return;
      }
      router.replace(searchParams.get("redirect") || "/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAccept = (id: string) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allAccepted = missing.length > 0 && missing.every((m) => accepted.has(m.id));

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <p className="text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  if (missing.length === 0) {
    router.replace(searchParams.get("redirect") || "/dashboard");
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <p className="text-[var(--color-muted)]">Redirecting…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-[var(--color-navy)]">Required agreements</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Please read and accept the following to continue.
          </p>
        </header>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="space-y-4">
          {missing.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={p.id}
                  checked={accepted.has(p.id)}
                  onChange={() => toggleAccept(p.id)}
                  className="mt-1 rounded border-[var(--color-border)] bg-white text-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor={p.id} className="font-medium text-[var(--color-charcoal)] cursor-pointer">
                    {p.title}
                  </label>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">Version {p.version}</p>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-3 text-xs text-[var(--color-slate)] whitespace-pre-wrap">
                    {p.content || "No content."}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleAcceptAll}
            disabled={!allAccepted || submitting}
            className="rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
          >
            {submitting ? "Saving…" : "I accept and continue"}
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-slate)] hover:text-[var(--color-navy)] text-center"
          >
            Sign out
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
          <p className="text-[var(--color-muted)]">Loading…</p>
        </main>
      }
    >
      <ConsentContent />
    </Suspense>
  );
}
