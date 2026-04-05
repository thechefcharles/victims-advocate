// app/dashboard/clients/[clientId]/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type CaseRow = {
  id: string;
  created_at?: string;
  status?: string;
  state_code?: string;
  application?: any;
  access?: { can_view: boolean; can_edit: boolean };
};

function safeParseApp(app: any) {
  if (!app) return null;
  if (typeof app === "string") {
    try {
      return JSON.parse(app);
    } catch {
      return null;
    }
  }
  return app;
}

function pickFirst(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

export default function ClientCasesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  // ✅ robust clientId: params first, then pathname fallback
  const clientId = useMemo(() => {
    const fromParams = pickFirst((params as any)?.clientId);
    if (fromParams) return fromParams;

    // pathname looks like: /dashboard/clients/<id>
    const parts = (pathname || "").split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last) return null;

    // guard: if user is on /dashboard/clients (no id), don't treat "clients" as id
    if (last === "clients") return null;

    return last;
  }, [params, pathname]);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [clientTitle, setClientTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchCases = useCallback(async () => {
    if (!clientId) {
      setErr("Missing client id in URL.");
      setCases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`/api/advocate/clients/${clientId}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();

        if (res.status === 403) {
          setErr("You don’t have access to this client.");
          setCases([]);
          setClientTitle(null);
          return;
        }

        if (res.status === 404) {
          setErr("Client not found (or no cases shared yet).");
          setCases([]);
          setClientTitle(null);
          return;
        }

        throw new Error(text);
      }

      const json = await res.json();
      setCases((json.cases ?? []) as CaseRow[]);
      setClientTitle(typeof json.client_display_name === "string" ? json.client_display_name : null);
    } catch (e) {
      console.error("Failed to load client cases:", e);
      setErr("Couldn’t load client cases. Please try again.");
      setCases([]);
      setClientTitle(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, router]);

  useEffect(() => {
    // ✅ only call the API when clientId is valid
    if (!clientId) {
      setLoading(false);
      setErr("Missing client id in URL.");
      return;
    }
    fetchCases();
  }, [clientId, fetchCases]);

  const clientDisplayName = useMemo(() => {
    if (clientTitle?.trim()) return clientTitle.trim();
    const firstCase = cases?.[0];
    const app = safeParseApp(firstCase?.application);
    const first = app?.victim?.firstName?.trim?.() ?? "";
    const last = app?.victim?.lastName?.trim?.() ?? "";
    const full = `${first} ${last}`.trim();
    return full || `Client ${clientId ? clientId.slice(0, 8) : "—"}…`;
  }, [clientTitle, cases, clientId]);

  const removeClient = useCallback(async () => {
    if (!clientId) return;
    const ok = window.confirm(
      `Remove ${clientDisplayName} from your client list?\n\n` +
        "You will lose access to their cases and secure messages until they connect with you again."
    );
    if (!ok) return;

    setRemoving(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }
      const res = await fetch(`/api/advocate/clients/${encodeURIComponent(clientId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setErr(getApiErrorMessage(json, "Couldn’t remove this client."));
        return;
      }
      router.replace("/dashboard/clients");
    } catch (e) {
      console.error(e);
      setErr("Couldn’t remove this client. Please try again.");
    } finally {
      setRemoving(false);
    }
  }, [clientId, clientDisplayName, router]);

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
              My clients
            </p>
            <h1 className="text-2xl font-semibold">{clientDisplayName}</h1>
            <p className="text-[11px] text-[var(--color-muted)]">Cases shared with you</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={fetchCases}
              disabled={loading || !clientId}
              className="text-[11px] rounded-full border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-warm-cream)]/85 disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void removeClient()}
              disabled={removing || !clientId || loading}
              className="text-[11px] rounded-full border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 font-medium text-rose-100 hover:bg-rose-950/50 disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove Client"}
            </button>

            <Link
              href="/dashboard/clients"
              className="text-[11px] text-teal-300/90 hover:text-teal-200"
            >
              ← My clients
            </Link>
          </div>
        </div>

        {!clientId ? (
          <p className="text-[11px] text-red-300">Missing client id in URL.</p>
        ) : loading ? (
          <p className="text-[11px] text-[var(--color-muted)]">Loading…</p>
        ) : err ? (
          <p className="text-[11px] text-red-300">{err}</p>
        ) : cases.length === 0 ? (
          <p className="text-[11px] text-[var(--color-muted)]">No cases shared with you yet.</p>
        ) : (
          <div className="grid gap-3">
            {cases.map((c) => {
              const created = c.created_at
                ? new Date(c.created_at).toLocaleString()
                : "—";
              const status = c.status ?? "draft";

              const app = safeParseApp(c.application);
              const first = app?.victim?.firstName?.trim?.() ?? "";
              const last = app?.victim?.lastName?.trim?.() ?? "";
              const victimName = `${first} ${last}`.trim();

              const canEdit = !!c.access?.can_edit;
              const accessLabel = canEdit ? "Edit" : "View";

              return (
                <Link
                  key={c.id}
                  href={`/compensation/intake?case=${c.id}`}
                  className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 px-4 py-3 hover:bg-[var(--color-warm-cream)]/75 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[var(--color-navy)]">
                        {victimName ? victimName : `Case ${c.id.slice(0, 8)}…`}
                      </div>
                      <div className="text-[11px] text-[var(--color-muted)]">
                        Status: {status} • Created: {created}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] rounded-full border px-2 py-1 ${
                          canEdit
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                            : "border-[var(--color-border)] bg-[var(--color-warm-cream)]/85 text-[var(--color-slate)]"
                        }`}
                      >
                        {accessLabel}
                      </span>
                      <span className="text-[11px] text-[var(--color-slate)]">Open →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}