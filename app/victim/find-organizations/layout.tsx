import RequireVictimRole from "@/components/auth/RequireApplicantRole";

export default function VictimFindOrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireVictimRole>{children}</RequireVictimRole>;
}
