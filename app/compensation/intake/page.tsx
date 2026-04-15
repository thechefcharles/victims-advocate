"use client";

/**
 * Phase F — Legacy compensation intake redirect.
 *
 * The 5659-line hardcoded renderer was archived; the template-driven v2
 * renderer at /compensation/intake-v2 is now canonical. This stub preserves
 * the existing URL and forwards with query params intact so bookmarks and
 * in-flight links keep working.
 */

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LegacyIntakeRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const qs = params?.toString() ?? "";
    router.replace(`/compensation/intake-v2${qs ? `?${qs}` : ""}`);
  }, [router, params]);

  return (
    <main className="mx-auto max-w-xl p-8 text-sm text-gray-600">
      Updating to the new intake experience…
    </main>
  );
}
