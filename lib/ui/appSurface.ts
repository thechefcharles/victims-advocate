/**
 * Shared surface tokens for cards, tables, and page shells (Brand Kit V2 light theme).
 */

/** Default full-page background + padding */
export const APP_PAGE_MAIN =
  "min-h-screen bg-[var(--color-warm-white)] text-[var(--color-charcoal)] px-4 sm:px-8 py-8 sm:py-10";

/** Standard content max width */
export const APP_PAGE_CONTAINER = "max-w-5xl mx-auto space-y-6";

/** Primary card: sections, panels */
export const APP_CARD =
  "rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm";

/** Dense card (stats, small panels) */
export const APP_CARD_COMPACT =
  "rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm";

/** Table wrapper with horizontal scroll on small screens */
export const APP_TABLE_WRAP =
  "rounded-2xl border border-[var(--color-border)] bg-white overflow-x-auto shadow-sm";

export const APP_TABLE = "w-full border-collapse text-xs min-w-[640px]";

export const APP_TABLE_HEAD_CELL =
  "text-left py-2.5 px-3 font-medium text-[var(--color-muted)] border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)]";

export const APP_TABLE_HEAD_CELL_RIGHT =
  "text-right py-2.5 px-3 font-medium text-[var(--color-muted)] border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)]";

export const APP_TABLE_ROW =
  "border-b border-[var(--color-border-light)] hover:bg-[var(--color-teal-light)]/25";

export const APP_TABLE_CELL = "py-2.5 px-3 align-top text-[var(--color-slate)]";

export const APP_TABLE_CELL_RIGHT =
  "py-2.5 px-3 align-top text-[var(--color-slate)] text-right";

export const APP_EMPTY_STATE =
  "rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/60 px-4 py-6 text-sm text-[var(--color-muted)]";
