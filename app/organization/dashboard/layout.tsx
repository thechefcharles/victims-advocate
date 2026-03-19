import RequireOrgLeadership from "@/components/auth/RequireOrgLeadership";

export default function OrganizationDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireOrgLeadership>{children}</RequireOrgLeadership>;
}
