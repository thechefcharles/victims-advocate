"use client";

import { useEffect, useState } from "react";
import type { IlVictimAssistanceProgram } from "@/lib/catalog/ilProgramTypes";
import { ProgramCatalogSelect } from "./ProgramCatalogSelect";

export function ProgramAffiliationForm({
  accessToken,
  initialCatalogId,
  onSaved,
}: {
  accessToken: string | null;
  initialCatalogId: number | null;
  onSaved?: () => void;
}) {
  const [catalogId, setCatalogId] = useState<number | null>(initialCatalogId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCatalogId(initialCatalogId);
  }, [initialCatalogId]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setMsg(null);
    setErr(null);
    if (!accessToken) {
      setErr("Not signed in.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/program-affiliation", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ catalog_entry_id: catalogId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((json as { message?: string }).message ?? "Could not save");
        return;
      }
      setMsg("Saved.");
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-sm font-medium text-slate-100">Illinois program directory</h2>
        <p className="text-xs text-slate-500 mt-1">
          Link your account to a listed Crime Victim Assistance program (name, program type, address,
          phone, and website come from the official directory when you pick a row).
        </p>
      </div>
      <ProgramCatalogSelect
        id="account-program-affiliation"
        label="Your program"
        value={catalogId}
        onChange={(id: number | null, _p: IlVictimAssistanceProgram | null) => setCatalogId(id)}
      />
      <button
        type="button"
        disabled={saving || !accessToken}
        onClick={save}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save affiliation"}
      </button>
      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-red-300">{err}</p>}
    </div>
  );
}
