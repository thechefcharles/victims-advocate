"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isApplicantFacingPath } from "@/lib/applicant/isApplicantFacingPath";
import { ApplicantCrisisStrip } from "@/components/applicant/ApplicantCrisisStrip";

/**
 * Injects crisis resources strip and body padding on applicant-facing routes (single mount in root layout).
 */
export function ApplicantPathChrome() {
  const pathname = usePathname();
  const active = isApplicantFacingPath(pathname);

  useEffect(() => {
    if (!active) return;
    document.body.classList.add("applicant-path-chrome-active");
    return () => document.body.classList.remove("applicant-path-chrome-active");
  }, [active]);

  if (!active) return null;
  return <ApplicantCrisisStrip />;
}
