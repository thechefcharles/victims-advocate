"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { RESPONSE_ACCESSIBILITY_FIELD_LABELS } from "@/lib/organizations/responseAccessibilityPublic";
import type { ResponseAccessibilityPublic } from "@/lib/organizations/responseAccessibilityPublic";

export type LearnMoreCopy = {
  title: string;
  close: string;
  externalDirectoryNote: string;
  fieldPendingExternal: string;
  fieldPendingFallback: string;
  directoryContactHeading: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  orgName: string;
  external: boolean;
  directoryContactPills?: { label: string; value: string }[];
  responseAccessibility: ResponseAccessibilityPublic | null;
  copy: LearnMoreCopy;
};

export function OrganizationLearnMoreModal({
  open,
  onClose,
  orgName,
  external,
  directoryContactPills,
  responseAccessibility,
  copy,
}: Props) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const modal = (
    <div className="fixed inset-0 z-[20000] flex items-end justify-center sm:items-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-[2px]"
        aria-label={copy.close}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-learn-more-title"
        className="relative z-10 w-full max-w-lg max-h-[min(90vh,640px)] overflow-hidden rounded-2xl border border-slate-600 bg-slate-950 shadow-2xl shadow-black/50 flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 rounded-full bg-blue-600/30 px-2 py-0.5 text-[10px] font-bold text-blue-200">
              25%
            </span>
            <h2 id="org-learn-more-title" className="text-sm font-semibold text-white truncate">
              {copy.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={copy.close}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-3 flex-1 min-h-0">
          <p className="text-sm font-medium text-slate-100">{orgName}</p>
          {external ? (
            <p className="text-xs text-slate-400 leading-relaxed">{copy.externalDirectoryNote}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {RESPONSE_ACCESSIBILITY_FIELD_LABELS.map(({ key, label, dashed }) => {
              const value = external
                ? copy.fieldPendingExternal
                : (responseAccessibility?.[key] ?? copy.fieldPendingFallback);
              return (
                <div
                  key={key}
                  className={`rounded-lg border px-2.5 py-1.5 max-w-full ${
                    dashed ? "border-dashed border-slate-500" : "border-slate-600"
                  } bg-slate-900/80`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="text-xs text-slate-200 mt-0.5 break-words">{value}</div>
                </div>
              );
            })}
          </div>

          {external && directoryContactPills && directoryContactPills.length > 0 ? (
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {copy.directoryContactHeading}
              </p>
              <div className="flex flex-wrap gap-2">
                {directoryContactPills.map((p, i) => (
                  <div
                    key={`${p.label}-${i}`}
                    className="rounded-lg border border-slate-600 px-2.5 py-1.5 max-w-full bg-slate-900/80"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{p.label}</div>
                    <div className="text-xs text-slate-200 mt-0.5 break-words">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
