import RequireVictimRole from "@/components/auth/RequireApplicantRole";

export default function VictimOrganizationProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireVictimRole>{children}</RequireVictimRole>;
}
