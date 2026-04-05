"use client";

import { useCallback, useMemo, useState } from "react";
import type { ResponseAccessibilityPublic } from "@/lib/organizations/responseAccessibilityPublic";
import {
  FRAMEWORK_THEME_STYLES,
  ORG_TRANSPARENCY_FRAMEWORK_SECTIONS,
  type FrameworkField,
} from "@/lib/organizations/orgTransparencyFrameworkCatalog";

export type TransparencyFrameworkCopy = {
  learnMoreDialogTitle: string;
  learnMoreDialogSubtitle: string;
  frameworkFieldPending: string;
  fieldPendingExternal: string;
  fieldPendingFallback: string;
  tier1Title: string;
  tier1Desc: string;
  tier2Title: string;
  tier2Desc: string;
  tier3Title: string;
  tier3Desc: string;
  sourceSelfHint: string;
  sourcePlatformHint: string;
};

function SourceIcon({
  source,
  selfHint,
  platformHint,
}: {
  source: "self" | "platform";
  selfHint: string;
  platformHint: string;
}) {
  if (source === "platform") {
    return (
      <span title={platformHint} className="inline-flex shrink-0 text-amber-400/95" aria-hidden>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path
            fillRule="evenodd"
            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }
  return (
    <span title={selfHint} className="inline-flex shrink-0 text-[var(--color-muted)]" aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <circle cx="10" cy="10" r="3.5" />
      </svg>
    </span>
  );
}

function resolveFieldValue(
  field: FrameworkField,
  external: boolean,
  responseAccessibility: ResponseAccessibilityPublic | null,
  copy: TransparencyFrameworkCopy
): string {
  if (external) return copy.fieldPendingExternal;
  if (field.responseKey && responseAccessibility) {
    const v = responseAccessibility[field.responseKey];
    if (v != null && String(v).trim() !== "") return v;
    return copy.fieldPendingFallback;
  }
  return copy.frameworkFieldPending;
}

type Props = {
  external: boolean;
  responseAccessibility: ResponseAccessibilityPublic | null;
  copy: TransparencyFrameworkCopy;
  /** When true, omit the top “how we show quality” title block (e.g. org profile already has a page title). */
  omitIntroHeading?: boolean;
};

export function OrganizationTransparencyFramework({
  external,
  responseAccessibility,
  copy,
  omitIntroHeading = false,
}: Props) {
  const sectionIds = useMemo(() => ORG_TRANSPARENCY_FRAMEWORK_SECTIONS.map((s) => s.id), []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sectionIds.map((id) => [id, true]))
  );

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="space-y-4">
      {!omitIntroHeading ? (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-white">{copy.learnMoreDialogTitle}</h2>
          <p className="text-[11px] text-[var(--color-muted)] leading-snug">{copy.learnMoreDialogSubtitle}</p>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-teal-500/30 bg-teal-950/25 px-2.5 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-teal-200/95">
            {copy.tier1Title}
          </div>
          <p className="text-[10px] text-[var(--color-muted)] mt-1 leading-snug">{copy.tier1Desc}</p>
        </div>
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 px-2.5 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-200/90">
            {copy.tier2Title}
          </div>
          <p className="text-[10px] text-[var(--color-muted)] mt-1 leading-snug">{copy.tier2Desc}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-muted)]/35 bg-white/92 px-2.5 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-slate)]">
            {copy.tier3Title}
          </div>
          <p className="text-[10px] text-[var(--color-muted)] mt-1 leading-snug">{copy.tier3Desc}</p>
        </div>
      </div>

      <p className="text-[10px] text-[var(--color-muted)] flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1">
          <SourceIcon source="self" selfHint={copy.sourceSelfHint} platformHint={copy.sourcePlatformHint} />
          {copy.sourceSelfHint}
        </span>
        <span className="inline-flex items-center gap-1">
          <SourceIcon source="platform" selfHint={copy.sourceSelfHint} platformHint={copy.sourcePlatformHint} />
          {copy.sourcePlatformHint}
        </span>
      </p>

      <div className="space-y-2">
        {ORG_TRANSPARENCY_FRAMEWORK_SECTIONS.map((section) => {
          const styles = FRAMEWORK_THEME_STYLES[section.theme];
          const isOpen = expanded[section.id] !== false;
          return (
            <div
              key={section.id}
              className={`rounded-xl border overflow-hidden ${styles.border} bg-[var(--color-warm-cream)]/70`}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left ${styles.headerBg}`}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}
                  >
                    {section.weightPercent}%
                  </span>
                  <span className="text-xs font-semibold text-white truncate">{section.title}</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isOpen ? (
                <div className="px-3 pb-3 pt-2 flex flex-wrap gap-2 border-t border-[var(--color-border-light)]">
                  {section.fields.map((field) => (
                    <div
                      key={field.id}
                      className={`rounded-lg border px-2.5 py-1.5 max-w-full flex gap-1.5 items-start bg-white/92 ${
                        field.dashed ? "border-dashed border-[var(--color-muted)]" : "border-[var(--color-border)]"
                      }`}
                    >
                      <SourceIcon
                        source={field.source}
                        selfHint={copy.sourceSelfHint}
                        platformHint={copy.sourcePlatformHint}
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)] leading-tight">
                          {field.label}
                        </div>
                        <div className="text-xs text-[var(--color-charcoal)] mt-0.5 break-words">
                          {resolveFieldValue(field, external, responseAccessibility, copy)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
