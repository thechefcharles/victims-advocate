import RequireVictimRole from "@/components/auth/RequireVictimRole";

export default function VictimOrganizationProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireVictimRole>{children}</RequireVictimRole>;
}
