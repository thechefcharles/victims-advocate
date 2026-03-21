/**
 * Shared surface tokens for cards, tables, and page shells (Phase 9, UI-only).
 */

/** Default full-page background + padding */
export const APP_PAGE_MAIN =
  "min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8 sm:py-10";

/** Standard content max width */
export const APP_PAGE_CONTAINER = "max-w-5xl mx-auto space-y-6";

/** Primary card: sections, panels */
export const APP_CARD =
  "rounded-2xl border border-slate-700 bg-slate-900 p-5";

/** Dense card (stats, small panels) */
export const APP_CARD_COMPACT =
  "rounded-xl border border-slate-700 bg-slate-900 p-4";

/** Table wrapper with horizontal scroll on small screens */
export const APP_TABLE_WRAP =
  "rounded-2xl border border-slate-700 bg-slate-900 overflow-x-auto";

export const APP_TABLE = "w-full border-collapse text-xs min-w-[640px]";

export const APP_TABLE_HEAD_CELL =
  "text-left py-2.5 px-3 font-medium text-slate-400 border-b border-slate-800 bg-slate-950/80";

export const APP_TABLE_HEAD_CELL_RIGHT =
  "text-right py-2.5 px-3 font-medium text-slate-400 border-b border-slate-800 bg-slate-950/80";

export const APP_TABLE_ROW = "border-b border-slate-800/80 hover:bg-slate-900/50";

export const APP_TABLE_CELL = "py-2.5 px-3 align-top text-slate-300";

export const APP_TABLE_CELL_RIGHT = "py-2.5 px-3 align-top text-slate-300 text-right";

export const APP_EMPTY_STATE =
  "rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400";
