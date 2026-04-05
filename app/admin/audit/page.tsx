"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type AuditLogRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  severity: string;
  metadata: Record<string, unknown>;
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("");
  const [filterActor, setFilterActor] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const params = new URLSearchParams();
        if (filterAction) params.set("action", filterAction);
        if (filterActor) params.set("actor_user_id", filterActor);

        const res = await fetch(`/api/audit/logs?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setErr(
            getApiErrorMessage(
              json,
              "We couldn't load audit logs. Refresh the page and try again.",
            ),
          );
          setLogs([]);
          return;
        }

        const json = await res.json();
        setLogs(json.logs ?? []);
        setErr(null);
      } catch (e) {
        setErr(
          "We couldn't load audit logs — the request was interrupted. Check your connection and try again.",
        );
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [filterAction, filterActor]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)]">
              Admin · Audit Log
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Audit logs</h1>
          </div>
          <Link
            href="/admin/cases"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
          >
            ← Back to cases
          </Link>
        </header>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Filter by action (e.g. auth.login)"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] max-w-xs"
          />
          <input
            type="text"
            placeholder="Filter by actor user ID"
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] max-w-xs"
          />
        </div>

        {err && (
          <p className="text-sm text-red-400">{err}</p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading…</p>
        ) : (
          <div className="rounded-2xl border border-[var(--color-border-light)] overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[var(--color-slate)]">Time</th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-slate)]">Action</th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-slate)]">Actor</th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-slate)]">Resource</th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-slate)]">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-warm-cream)]/80"
                    >
                      <td className="px-4 py-2 text-[var(--color-muted)] whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-2 font-mono text-[var(--color-charcoal)]">
                        {row.action}
                      </td>
                      <td className="px-4 py-2 text-[var(--color-muted)]">
                        {row.actor_user_id
                          ? `${row.actor_user_id.slice(0, 8)}… (${row.actor_role ?? "—"})`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-[var(--color-muted)]">
                        {row.resource_type && row.resource_id
                          ? `${row.resource_type}:${String(row.resource_id).slice(0, 8)}…`
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            row.severity === "security"
                              ? "text-amber-400"
                              : row.severity === "warning"
                                ? "text-yellow-400"
                                : "text-[var(--color-muted)]"
                          }
                        >
                          {row.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && !loading && (
              <p className="px-4 py-8 text-center text-[var(--color-muted)]">
                No audit logs found. Run the migration and generate some activity.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
