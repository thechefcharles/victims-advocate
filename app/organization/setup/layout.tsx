import { RequireAuth } from "@/components/auth/RequireAuth";
import RequireOrganizationAccount from "@/components/auth/RequireOrganizationAccount";

export default function OrganizationSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <RequireOrganizationAccount>{children}</RequireOrganizationAccount>
    </RequireAuth>
  );
}
