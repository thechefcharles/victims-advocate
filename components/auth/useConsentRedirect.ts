"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirects to /consent if terms/privacy not accepted. Call from role dashboards when bypassing /dashboard.
 */
export function useConsentRedirect(accessToken: string | null, redirectBack: string) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/policies/active", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        if (!cancelled) setReady(true);
        return;
      }
      const json = await res.json();
      const missing = (json.data?.missing_doc_types ?? []) as string[];
      const needs =
        missing.includes("terms_of_use") || missing.includes("privacy_policy");
      if (needs) {
        router.replace(`/consent?redirect=${encodeURIComponent(redirectBack)}`);
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, redirectBack, router]);

  return ready;
}
