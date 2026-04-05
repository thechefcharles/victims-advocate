"use client";

import { useEffect, useState } from "react";
import type { IlVictimAssistanceProgram } from "@/lib/catalog/ilProgramTypes";
import { ProgramCatalogSelect } from "./ProgramCatalogSelect";

/** Org admins: update which Illinois directory row represents this agency. */
export function OrganizationCatalogForm({
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
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setCatalogId(initialCatalogId);
  }, [initialCatalogId]);

  const save = async () => {
    setMsg(null);
    setErr(null);
    if (!accessToken) {
      setErr("Not signed in.");
      return;
    }
    if (catalogId == null) {
      setErr("Select a program from the directory.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/org/program-catalog", {
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
    <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/75 p-4">
      <div>
        <h2 className="text-sm font-medium text-[var(--color-navy)]">Your organization in the directory</h2>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          Choose the Illinois Crime Victim Assistance program row that matches this account. Your
          agency name and type update from the official listing.
        </p>
      </div>
      <ProgramCatalogSelect
        id="org-program-catalog"
        label="Program directory row"
        required
        value={catalogId}
        onChange={(id: number | null, _p: IlVictimAssistanceProgram | null) => setCatalogId(id)}
      />
      <button
        type="button"
        disabled={saving || !accessToken || catalogId == null}
        onClick={save}
        className="rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save organization directory link"}
      </button>
      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-red-300">{err}</p>}
    </div>
  );
}
