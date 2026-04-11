import RequireVictimRole from "@/components/auth/RequireApplicantRole";

export default function VictimDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireVictimRole>{children}</RequireVictimRole>;
}
