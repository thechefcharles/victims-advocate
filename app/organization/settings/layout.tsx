import RequireOrgWorkspaceAccess from "@/components/auth/RequireOrgWorkspaceAccess";

/** Org workspace (profile, trust, members) — not gated by advocate profile role; see RequireOrgWorkspaceAccess. */
export default function OrganizationSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireOrgWorkspaceAccess>{children}</RequireOrgWorkspaceAccess>;
}
