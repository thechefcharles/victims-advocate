import RequireApplicantRole from "@/components/auth/RequireApplicantRole";

export default function VictimFindOrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireApplicantRole>{children}</RequireApplicantRole>;
}
