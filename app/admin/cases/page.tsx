"use client";

import { useEffect, useState } from "react";

const CASES_STORAGE_KEY = "nxtstps_cases_v1";

type CaseStatus = "draft" | "ready_for_review";

interface UploadedDoc {
  id: string;
  type: string;
  description: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
}

interface SavedCase {
  id: string;
  createdAt: string;
  status: CaseStatus;
  application: {
    victim?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      city?: string;
      state?: string;
    };
    crime?: {
      dateOfCrime?: string;
      crimeCity?: string;
      crimeCounty?: string;
      reportingAgency?: string;
    };
    losses?: Record<string, boolean>;
  };
  documents?: UploadedDoc[]; // 👈 NEW
}

export default function CasesPage() {
  const [cases, setCases] = useState<SavedCase[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CASES_STORAGE_KEY);
      const parsed: SavedCase[] = raw ? JSON.parse(raw) : [];
      // sort newest first
      parsed.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setCases(parsed);
    } catch (err) {
      console.error("Failed to load saved cases", err);
    }
  }, []);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Admin · Cases (Local Prototype)
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Saved compensation cases
          </h1>
          <p className="text-sm text-slate-300">
            This page shows cases that have been saved from the guided intake
            on this browser. In a future version, cases will be stored in a
            secure backend and shared across advocates and organizations.
          </p>
        </header>

        {cases.length === 0 ? (
          <p className="text-xs text-slate-400">
            No cases saved yet. Complete an intake and click &quot;Save as
            case&quot; on the summary screen to see it appear here.
          </p>
        ) : (
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2 pr-3 font-normal">Victim</th>
                  <th className="text-left py-2 pr-3 font-normal">City</th>
                  <th className="text-left py-2 pr-3 font-normal">
                    Date of crime
                  </th>
                  <th className="text-left py-2 pr-3 font-normal">
                    Created
                  </th>
                    <th className="text-left py-2 pr-3 font-normal">Status</th>
                    <th className="text-left py-2 pr-3 font-normal">Docs</th>
                    <th className="text-left py-2 pr-3 font-normal">
                    Losses selected
                    </th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const v = c.application.victim || {};
                  const cr = c.application.crime || {};
                  const losses = c.application.losses || {};
                  const selectedLossTypes = Object.entries(losses)
                    .filter(([_, val]) => val)
                    .map(([key]) => key);
                    const docList = c.documents || [];
                    const docCount = docList.length;

                    // Optional: quick breakdown by type
                    const typeCounts: Record<string, number> = {};
                    for (const d of docList) {
                    typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
                    }
                    const typeSummary = Object.entries(typeCounts)
                    .map(([t, n]) => `${t.replace(/_/g, " ")} (${n})`)
                    .join(", ");

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-slate-900 hover:bg-slate-900/60"
                    >
                      <td className="py-2 pr-3 align-top">
                        <div className="space-y-0.5">
                        <a
                            href={`/admin/cases/${c.id}`}
                            className="font-semibold text-slate-100 hover:text-emerald-300 hover:underline underline-offset-2"
                        >
                            {(v.firstName || "") +
                            (v.firstName || v.lastName ? " " : "") +
                            (v.lastName || "") || "Unknown victim"}
                        </a>
                        <div className="text-[11px] text-slate-400">
                            DOB: {v.dateOfBirth || "—"}
                        </div>
                        </div>                      </td>
                      <td className="py-2 pr-3 align-top text-[11px] text-slate-300">
                        {v.city || cr.crimeCity || "—"}
                        {v.state || cr.crimeCounty
                          ? `, ${v.state || cr.crimeCounty}`
                          : ""}
                      </td>
                      <td className="py-2 pr-3 align-top text-[11px] text-slate-300">
                        {cr.dateOfCrime || "—"}
                      </td>
                      <td className="py-2 pr-3 align-top text-[11px] text-slate-300">
                        {formatDate(c.createdAt)}
                      </td>
                    <td className="py-2 pr-3 align-top text-[11px]">
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                        c.status === "ready_for_review"
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-300 border border-slate-600"
                        }`}
                    >
                        {c.status === "ready_for_review" ? "Ready for review" : "Draft"}
                    </span>
                    </td>

                    <td className="py-2 pr-3 align-top text-[11px] text-slate-300">
                    {docCount === 0
                        ? "No docs"
                        : `${docCount} doc${docCount > 1 ? "s" : ""}${
                            typeSummary ? ` – ${typeSummary}` : ""
                        }`}
                    </td>

                    <td className="py-2 pr-3 align-top text-[11px] text-slate-300">
                    {selectedLossTypes.length === 0
                        ? "None"
                        : selectedLossTypes.join(", ")}
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <p className="text-[11px] text-slate-500">
          This is a local prototype view. In a production version, cases would
          be loaded from a secure database and include document previews,
          internal notes, and workflow tools for advocates.
        </p>
      </div>
    </main>
  );
}