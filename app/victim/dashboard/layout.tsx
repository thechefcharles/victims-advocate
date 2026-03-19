import RequireVictimRole from "@/components/auth/RequireVictimRole";

export default function VictimDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireVictimRole>{children}</RequireVictimRole>;
}
