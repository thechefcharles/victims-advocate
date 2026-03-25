import RequireOrgLeadership from "@/components/auth/RequireOrgLeadership";

/** Leadership operational home — guard is membership-led (see RequireOrgLeadership). */
export default function OrganizationDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireOrgLeadership>{children}</RequireOrgLeadership>;
}
