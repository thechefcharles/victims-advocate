import RequireAdvocateRole from "@/components/auth/RequireAdvocateRole";

/** Only advocate profile role can access /advocate/* (advocate dashboard, message triage, org tools). */
export default function AdvocateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAdvocateRole>{children}</RequireAdvocateRole>;
}
