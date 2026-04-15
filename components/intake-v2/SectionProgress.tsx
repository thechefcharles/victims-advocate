"use client";

/**
 * Linear step indicator. Each pill shows one of three states:
 *   ✓ (green)     — section is complete (all required fields filled)
 *   ! (red badge) — section has been visited and has missing required fields
 *   n (neutral)   — section hasn't been visited yet
 *
 * The active section pill is highlighted blue regardless of its state so the
 * user can still see where they are. Numeric count replaces the step number
 * in the circle only when the section has been visited and is incomplete —
 * otherwise the circle shows ✓ or the step number.
 */

import type { RenderSection } from "./types";
import type { SectionCompletion } from "@/lib/server/intakeV2/completionEngine";

interface Props {
  sections: RenderSection[];
  activeKey: string | null;
  visitedKeys: string[];
  completionBySection: Record<string, SectionCompletion>;
  onSelect: (key: string) => void;
}

export function SectionProgress({
  sections,
  activeKey,
  visitedKeys,
  completionBySection,
  onSelect,
}: Props) {
  const visitedSet = new Set(visitedKeys);
  return (
    <ol
      className="flex flex-nowrap gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
      aria-label="Intake progress"
    >
      {sections.map((s, i) => {
        const isActive = s.sectionKey === activeKey;
        const isVisited = visitedSet.has(s.sectionKey);
        const status = completionBySection[s.sectionKey];
        const isComplete = status?.isComplete === true;
        const missingCount = status?.missingFields.length ?? 0;
        // Only surface a completion verdict once the user has actually opened
        // the section. An unvisited section with zero required fields is
        // vacuously "complete" from the engine's POV but should not claim a
        // green ✓ before the user has seen it.
        const showComplete = isVisited && isComplete;
        const showIncomplete = isVisited && !isComplete && missingCount > 0;

        const base =
          "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium transition";
        const tone = isActive
          ? "border-blue-600 bg-blue-50 text-blue-900"
          : showComplete
            ? "border-green-600 bg-green-50 text-green-900"
            : showIncomplete
              ? "border-red-500 bg-red-50 text-red-900"
              : "border-gray-300 bg-white text-gray-700";

        const badgeTone = showComplete
          ? "border-green-600 bg-white text-green-700"
          : showIncomplete
            ? "border-red-500 bg-red-500 text-white"
            : "border-gray-300 bg-white text-gray-600";

        const badgeContent = showComplete
          ? "✓"
          : showIncomplete
            ? String(missingCount)
            : String(i + 1);

        const ariaLabel = showComplete
          ? `${s.sectionTitle} — complete`
          : showIncomplete
            ? `${s.sectionTitle} — ${missingCount} required field${missingCount === 1 ? "" : "s"} missing`
            : s.sectionTitle;

        return (
          <li key={s.sectionKey}>
            <button
              type="button"
              onClick={() => onSelect(s.sectionKey)}
              className={`${base} ${tone}`}
              aria-current={isActive ? "step" : undefined}
              aria-label={ariaLabel}
            >
              <span
                className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border px-1 text-[10px] font-semibold ${badgeTone}`}
                aria-hidden
              >
                {badgeContent}
              </span>
              {s.sectionTitle}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
