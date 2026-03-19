import RequireAdvocateRole from "@/components/auth/RequireAdvocateRole";

export default function AdvocateDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAdvocateRole>{children}</RequireAdvocateRole>;
}
