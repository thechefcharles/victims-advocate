import RequireVictimRole from "@/components/auth/RequireVictimRole";

export default function VictimFindOrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireVictimRole>{children}</RequireVictimRole>;
}
