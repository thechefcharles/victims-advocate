"use client";

import Link from "next/link";
import {
  TRUST_LINK_HREF,
  TRUST_LINK_LABELS,
  TRUST_MICROCOPY,
  capacityCueLabel,
  confidenceChipText,
  designationTierBadgeText,
  designationTrustBadgeClassName,
  matchFitBadge,
} from "@/lib/trustDisplay";

export type RecommendedOrgMatchRow = {
  organization_id: string;
  organization_name: string;
  reasons: string[];
  flags: string[];
  service_overlap: string[];
  language_match: boolean;
  accessibility_match?: string[];
  capacity_signal: string | null;
  virtual_ok?: boolean | null;
  strong_match: boolean;
  possible_match: boolean;
  limited_match: boolean;
  designation_tier?: string | null;
  designation_confidence?: string | null;
  designation_summary?: string | null;
  designation_influenced_match?: boolean;
  designation_reason?: string | null;
};

export function RecommendedOrganizationCard({ match: m }: { match: RecommendedOrgMatchRow }) {
  const fit = matchFitBadge(m);
  const trustName = designationTierBadgeText(m.designation_tier ?? null);
  const conf = confidenceChipText(m.designation_confidence ?? null);
  const cap = capacityCueLabel(m.capacity_signal);
  const acc = m.accessibility_match ?? [];
  const showDesignationBlock =
    Boolean(trustName || m.designation_summary?.trim() || m.designation_reason?.trim() || conf);
  const showDesignationLink =
    Boolean(m.designation_influenced_match || trustName || m.designation_summary || m.designation_reason);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-100">{m.organization_name}</span>
        {fit && <span className={fit.className}>{fit.label}</span>}
      </div>

      {m.service_overlap.length > 0 && (
        <p className="text-slate-400 text-[11px]">
          <span className="text-slate-500">Offers services aligned with:</span>{" "}
          {m.service_overlap.map((s) => s.replace(/_/g, " ")).join(", ")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {m.language_match && (
          <span className="text-slate-400 border border-slate-600/70 rounded px-1.5 py-0.5">
            Language match
          </span>
        )}
        {acc.length > 0 && (
          <span className="text-slate-400 border border-slate-600/70 rounded px-1.5 py-0.5 max-w-[min(100%,20rem)]">
            Supports: {acc.slice(0, 4).map((s) => s.replace(/_/g, " ")).join(", ")}
          </span>
        )}
        {cap && (
          <span className="text-slate-400 border border-slate-600/70 rounded px-1.5 py-0.5">
            {cap}
          </span>
        )}
        {m.virtual_ok === true && (
          <span className="text-slate-400 border border-slate-600/70 rounded px-1.5 py-0.5">
            Virtual options OK
          </span>
        )}
      </div>

      {showDesignationBlock && (
        <div className="rounded-lg border border-slate-800/90 bg-slate-950/40 px-3 py-2 space-y-1.5">
          <p className="text-[10px] text-slate-500 leading-snug">{TRUST_MICROCOPY.designationSmallSignal}</p>
          <div className="flex flex-wrap items-baseline gap-2">
            {trustName && (
              <span
                className={designationTrustBadgeClassName()}
                title={TRUST_MICROCOPY.designationNotRating}
              >
                {trustName}
              </span>
            )}
            {conf && <span className="text-[10px] text-slate-500">{conf}</span>}
          </div>
          {m.designation_summary && (
            <p className="text-slate-500 text-[10px] line-clamp-3">{m.designation_summary}</p>
          )}
          {m.designation_reason && (
            <p className="text-slate-400 text-[11px] leading-snug">{m.designation_reason}</p>
          )}
          {showDesignationLink && (
            <p className="text-[10px] pt-0.5">
              <Link
                href={TRUST_LINK_HREF.designations}
                className="text-slate-300 hover:text-white underline"
                target="_blank"
                rel="noreferrer"
              >
                {TRUST_LINK_LABELS.howDesignationUsed}
              </Link>
            </p>
          )}
        </div>
      )}

      {m.reasons.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Recommended because</p>
          <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
            {m.reasons.slice(0, 6).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {m.flags.length > 0 && (
        <ul className="text-amber-200/80 text-[11px] list-disc list-inside pt-1 border-t border-slate-800/60">
          {m.flags.slice(0, 4).map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
