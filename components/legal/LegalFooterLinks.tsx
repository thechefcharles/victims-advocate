import Link from "next/link";

/** Compact legal links for public policy pages. */
export function LegalFooterLinks() {
  return (
    <footer className="mt-12 border-t border-[var(--color-border-light)] pt-8 text-sm text-[var(--color-muted)]">
      <nav aria-label="Legal policies" className="flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/terms" className="underline-offset-2 hover:text-[var(--color-charcoal)] hover:underline">
          Terms of Use
        </Link>
        <span aria-hidden className="text-[var(--color-border)]">
          ·
        </span>
        <Link href="/privacy" className="underline-offset-2 hover:text-[var(--color-charcoal)] hover:underline">
          Privacy Policy
        </Link>
        <span aria-hidden className="text-[var(--color-border)]">
          ·
        </span>
        <Link
          href="/data-deletion"
          className="underline-offset-2 hover:text-[var(--color-charcoal)] hover:underline"
        >
          Data Deletion Policy
        </Link>
      </nav>
    </footer>
  );
}
