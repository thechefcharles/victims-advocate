const STORAGE_KEY = "nxt_legal_onboarding_context";

export type LegalOnboardingContext = {
  userType: "individual" | "organizational";
  organizationId: string | null;
  acceptingUserRole: string | null;
};

const defaultContext: LegalOnboardingContext = {
  userType: "individual",
  organizationId: null,
  acceptingUserRole: null,
};

export function readLegalOnboardingContext(): LegalOnboardingContext {
  if (typeof window === "undefined") return defaultContext;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultContext;
    const p = JSON.parse(raw) as Partial<LegalOnboardingContext>;
    const userType = p.userType === "organizational" ? "organizational" : "individual";
    return {
      userType,
      organizationId: typeof p.organizationId === "string" ? p.organizationId : null,
      acceptingUserRole: typeof p.acceptingUserRole === "string" ? p.acceptingUserRole : null,
    };
  } catch {
    return defaultContext;
  }
}

/** Persist pathway hints from invite / org signup URLs for later consent API calls. */
export function syncLegalOnboardingContextFromSearchParams(searchParams: URLSearchParams) {
  if (typeof window === "undefined") return;
  const ut = searchParams.get("user_type");
  const org = searchParams.get("organization_id");
  const role = searchParams.get("accepting_user_role");
  if (ut == null && org == null && role == null) return;

  const userType = ut === "organizational" ? "organizational" : "individual";
  const organizationId = org?.trim() || null;
  const acceptingUserRole = role?.trim() || null;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userType, organizationId, acceptingUserRole })
    );
  } catch {
    // ignore
  }
}
