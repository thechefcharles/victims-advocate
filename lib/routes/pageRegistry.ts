/**
 * Single source of truth for route paths and human-facing page names.
 * Use `ROUTES` in components instead of scattering string literals.
 *
 * See docs/routes.md for a short overview.
 */

export type PageAudience =
  | "public"
  | "authenticated"
  | "authenticated:admin"
  | "role:victim"
  | "role:advocate"
  | "role:organization"
  | "mixed";

export type PageRegistryEntry = {
  /** Stable id for tickets and docs (snake_case). */
  id: string;
  path: string;
  /** Product / design title. */
  title: string;
  /** Default export name of app/.../page.tsx when applicable. */
  defaultExportName?: string;
  audience: PageAudience;
  notes?: string;
};

/**
 * Curated registry — add rows as you need them for PM/design reference.
 * Not every route in the app is listed; extend when touching a new area.
 */
export const PAGE_REGISTRY: PageRegistryEntry[] = [
  {
    id: "marketing_landing",
    path: "/",
    title: "Marketing landing (public)",
    defaultExportName: "MarketingLandingPage",
    audience: "public",
    notes: "Hero, newsletter, MVP demo video (public/mvp-demo.mp4). Logo links here.",
  },
  {
    id: "compensation_hub",
    path: "/compensation",
    title: "Crime Victims Compensation hub",
    defaultExportName: "CompensationHubPage",
    audience: "public",
    notes: "Explains guided flow; CTA into intake. Top nav uses ROUTES.compensationHub.",
  },
  {
    id: "compensation_intake",
    path: "/compensation/intake",
    title: "Compensation guided intake",
    audience: "public",
    notes: "Multi-step application wizard.",
  },
  {
    id: "login",
    path: "/login",
    title: "Log in",
    audience: "public",
  },
  {
    id: "signup",
    path: "/signup",
    title: "Sign up",
    audience: "public",
  },
  {
    id: "dashboard_router",
    path: "/dashboard",
    title: "Dashboard (router)",
    audience: "authenticated",
    notes: "Often redirects to role-specific dashboard.",
  },
  {
    id: "applicant_dashboard",
    path: "/applicant/dashboard",
    title: "Applicant dashboard",
    audience: "role:victim",
  },
  {
    id: "applicant_messages",
    path: "/applicant/messages",
    title: "Secure messages (applicant)",
    audience: "role:victim",
    notes: "Case-scoped threads; not embedded in intake.",
  },
  {
    id: "applicant_find_organizations",
    path: "/applicant/find-organizations",
    title: "Find organizations (applicant)",
    audience: "role:victim",
    notes: "Placeholder for map / geo / org scores; linked from applicant dashboard.",
  },
  {
    id: "applicant_connect_organization_help",
    path: "/applicant/find-organizations/connect",
    title: "Connect — what do you need help with?",
    audience: "role:victim",
    notes: "Multi-select needs before POST /api/applicant/organization-connect-request; query: organization, optional case.",
  },
  {
    id: "advocate_dashboard",
    path: "/advocate",
    title: "Advocate dashboard (My Dashboard)",
    audience: "role:advocate",
  },
  {
    id: "advocate_messages",
    path: "/advocate/messages",
    title: "Advocate message triage (by case)",
    defaultExportName: "AdvocateMessagesPage",
    audience: "role:advocate",
    notes: "Lists cases with unread or recent secure message activity; uses existing case message APIs.",
  },
  {
    id: "organization_dashboard",
    path: "/organization/dashboard",
    title: "Organization dashboard",
    audience: "role:organization",
  },
  {
    id: "organization_setup",
    path: "/organization/setup",
    title: "Organization setup",
    audience: "role:organization",
  },
  {
    id: "organization_settings",
    path: "/organization/settings",
    title: "Organization workspace (settings)",
    audience: "mixed",
    notes:
      "Canonical org profile / members / trust workspace for leadership (owner|supervisor) and admins; not advocate-layout gated.",
  },
  {
    id: "admin_dashboard",
    path: "/admin/dashboard",
    title: "Platform admin",
    audience: "authenticated:admin",
  },
  {
    id: "account",
    path: "/account",
    title: "My account",
    audience: "authenticated",
  },
  {
    id: "knowledge_compensation",
    path: "/knowledge/compensation",
    title: "Knowledge: compensation",
    audience: "mixed",
  },
  {
    id: "help",
    path: "/help",
    title: "Help",
    audience: "public",
  },
];

/** Typed path constants — prefer these over raw strings in nav and CTAs. */
export const ROUTES = {
  marketingLanding: "/",
  compensationHub: "/compensation",
  compensationIntake: "/compensation/intake",
  compensationConnectAdvocate: "/compensation/connect-advocate",
  compensationDocuments: "/compensation/documents",
  login: "/login",
  signup: "/signup",
  signupAdvocate: "/signup/advocate",
  signupOrganization: "/signup/organization",
  account: "/account",
  dashboard: "/dashboard",
  dashboardClients: "/dashboard/clients",
  applicantDashboard: "/applicant/dashboard",
  applicantMessages: "/applicant/messages",
  applicantFindOrganizations: "/applicant/find-organizations",
  /** Before POST connect: applicant selects what they need help with. */
  applicantConnectOrganizationHelp: "/applicant/find-organizations/connect",
  /** Applicant-facing read-only organization profile (UUID). */
  applicantOrganization: (organizationId: string) =>
    `/applicant/organizations/${encodeURIComponent(organizationId)}`,
  advocateDashboard: "/advocate",
  advocateHome: "/advocate",
  advocateMessages: "/advocate/messages",
  advocateConnectionRequests: "/advocate/connection-requests",
  advocateFindOrganizations: "/advocate/find-organizations",
  advocateOrgSearch: "/advocate/org-search",
  advocateOrg: "/advocate/org",
  organizationDashboard: "/organization/dashboard",
  organizationSettings: "/organization/settings",
  organizationSetup: "/organization/setup",
  adminDashboard: "/admin/dashboard",
  knowledgeCompensation: "/knowledge/compensation",
  help: "/help",
  notifications: "/notifications",
  settingsSafety: "/settings/safety",
} as const;

/** Per-case applicant flows (dynamic segments). */
export const applicantCasePaths = {
  advocate: (caseId: string) => `/applicant/case/${encodeURIComponent(caseId)}/advocate`,
  organization: (caseId: string) => `/applicant/case/${encodeURIComponent(caseId)}/organization`,
} as const;

/** Deep-link to the dedicated secure messages tool for a case (victim). */
export function applicantCaseMessagesUrl(caseId: string): string {
  return `${ROUTES.applicantMessages}?case=${encodeURIComponent(caseId)}`;
}

/** Victim connect flow: choose help areas, then submit connect for this org. */
export function applicantConnectOrganizationHelpUrl(params: {
  organizationId: string;
  caseId?: string;
}): string {
  const q = new URLSearchParams();
  q.set("organization", params.organizationId.trim());
  const c = params.caseId?.trim();
  if (c) q.set("case", c);
  return `${ROUTES.applicantConnectOrganizationHelp}?${q.toString()}`;
}

/** @deprecated Use applicantCaseMessagesUrl — messages are no longer embedded in intake. */
export function compensationIntakeMessagesUrl(caseId: string): string {
  return applicantCaseMessagesUrl(caseId);
}

export function advocateCaseMessagesUrl(caseId: string): string {
  return `${ROUTES.advocateMessages}?case=${encodeURIComponent(caseId)}`;
}

export type AppRouteKey = keyof typeof ROUTES;
export type AppRoutePath = (typeof ROUTES)[AppRouteKey];
