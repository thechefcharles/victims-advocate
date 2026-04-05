/**
 * Routes where Phase 3 trauma-informed chrome applies (crisis strip, body padding, etc.).
 * Keep in sync with product — extend when new applicant-facing flows ship.
 */
export function isApplicantFacingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/victim")) return true;
  if (pathname.startsWith("/compensation/intake")) return true;
  if (pathname.startsWith("/compensation/eligibility")) return true;
  if (pathname.startsWith("/compensation/documents")) return true;
  if (pathname === "/compensation") return true;
  if (pathname.startsWith("/compensation/connect-advocate")) return true;
  if (pathname.startsWith("/start")) return true;
  if (pathname === "/consent") return true;
  return false;
}
