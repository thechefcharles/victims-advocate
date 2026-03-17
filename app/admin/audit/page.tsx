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
          setErr(getApiErrorMessage(json, "Failed to load audit logs"));
          setLogs([]);
          return;
        }

        const json = await res.json();
        setLogs(json.logs ?? []);
        setErr(null);
      } catch (e) {
        setErr("Failed to load audit logs");
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
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
              Admin · Audit Log
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Audit logs</h1>
          </div>
          <Link
            href="/admin/cases"
            className="text-sm text-slate-400 hover:text-slate-200"
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
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 max-w-xs"
          />
          <input
            type="text"
            placeholder="Filter by actor user ID"
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 max-w-xs"
          />
        </div>

        {err && (
          <p className="text-sm text-red-400">{err}</p>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-300">Time</th>
                    <th className="px-4 py-3 font-semibold text-slate-300">Action</th>
                    <th className="px-4 py-3 font-semibold text-slate-300">Actor</th>
                    <th className="px-4 py-3 font-semibold text-slate-300">Resource</th>
                    <th className="px-4 py-3 font-semibold text-slate-300">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-800/50 hover:bg-slate-900/50"
                    >
                      <td className="px-4 py-2 text-slate-400 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-200">
                        {row.action}
                      </td>
                      <td className="px-4 py-2 text-slate-400">
                        {row.actor_user_id
                          ? `${row.actor_user_id.slice(0, 8)}… (${row.actor_role ?? "—"})`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-400">
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
                                : "text-slate-500"
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
              <p className="px-4 py-8 text-center text-slate-500">
                No audit logs found. Run the migration and generate some activity.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
