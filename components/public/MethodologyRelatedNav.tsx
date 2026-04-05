"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/help", label: "Help home" },
  { href: "/help/transparency", label: "Transparency" },
  { href: "/help/how-matching-works", label: "How matching works" },
  { href: "/help/how-designations-work", label: "How designations work" },
] as const;

/** Small related-nav row for methodology / trust pages (Phase 7). */
export function MethodologyRelatedNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Related help pages"
      className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-[var(--color-border-light)] pt-6 text-sm"
    >
      {LINKS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "text-[var(--color-charcoal)] font-medium"
                : "text-teal-400/90 hover:text-teal-300"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
