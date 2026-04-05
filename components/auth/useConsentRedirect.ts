"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirects to signup legal consent when required, then to /consent if terms/privacy
 * policy acceptances are still missing. Use when a role dashboard bypasses `/dashboard`.
 */
export function useConsentRedirect(
  accessToken: string | null,
  redirectBack: string,
  authLoading: boolean,
  legalConsentNextPath: string | null
) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) {
      setReady(false);
      return;
    }
    if (!accessToken) {
      setReady(true);
      return;
    }
    if (legalConsentNextPath) {
      router.replace(`${legalConsentNextPath}?redirect=${encodeURIComponent(redirectBack)}`);
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
  }, [accessToken, redirectBack, router, authLoading, legalConsentNextPath]);

  return ready;
}
