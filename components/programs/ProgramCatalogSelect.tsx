"use client";

import { useEffect, useMemo, useState } from "react";
import type { IlVictimAssistanceProgram } from "@/lib/catalog/ilProgramTypes";

type Props = {
  value: number | null;
  onChange: (id: number | null, program: IlVictimAssistanceProgram | null) => void;
  label?: string;
  required?: boolean;
  id?: string;
};

export function ProgramCatalogSelect({
  value,
  onChange,
  label = "Illinois Crime Victim Assistance program",
  required = false,
  id = "program-catalog",
}: Props) {
  const [programs, setPrograms] = useState<IlVictimAssistanceProgram[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/il-victim-assistance-programs.json")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load program directory");
        return r.json();
      })
      .then((data: IlVictimAssistanceProgram[]) => {
        if (!cancelled) setPrograms(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Load failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => programs?.find((p) => p.id === value) ?? null,
    [programs, value]
  );

  const filtered = useMemo(() => {
    if (!programs) return [];
    const q = query.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) => {
      const hay = `${p.id} ${p.organization} ${p.programType} ${p.address}`.toLowerCase();
      return hay.includes(q);
    });
  }, [programs, query]);

  if (loadErr) {
    return <p className="text-sm text-red-300">{loadErr}</p>;
  }
  if (!programs) {
    return <p className="text-sm text-slate-500">Loading program directory…</p>;
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block space-y-1">
        <span className="text-[11px] text-slate-400">
          {label}
          {required ? " *" : ""}
        </span>
        <input
          id={id}
          type="search"
          autoComplete="off"
          placeholder="Type to filter by name, county, program type, or id…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      {selected && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-slate-200 space-y-1">
          <p className="font-medium text-emerald-200">
            #{selected.id} · {selected.organization}
          </p>
          <p className="text-slate-400">{selected.programType}</p>
          <p className="text-slate-400">{selected.address}</p>
          <p className="text-slate-400">
            {selected.phone}
            {selected.website && (
              <>
                {" · "}
                <a
                  href={selected.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  Website
                </a>
              </>
            )}
          </p>
          <button
            type="button"
            className="text-[11px] text-amber-300 hover:underline"
            onClick={() => onChange(null, null)}
          >
            Clear selection
          </button>
        </div>
      )}

      {open && (
        <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-lg">
          {filtered.slice(0, 80).map((p) => (
            <button
              key={p.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-xs border-b border-slate-800 hover:bg-slate-900 ${
                value === p.id ? "bg-slate-900" : ""
              }`}
              onClick={() => {
                onChange(p.id, p);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="text-slate-500 font-mono mr-2">#{p.id}</span>
              <span className="text-slate-200">{p.organization}</span>
              <span className="text-slate-500"> — {p.programType}</span>
            </button>
          ))}
          {filtered.length > 80 && (
            <p className="px-3 py-2 text-[11px] text-slate-500">Refine search to see more matches…</p>
          )}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">No matches. Try another search.</p>
          )}
        </div>
      )}
    </div>
  );
}
