import RequireAdvocateRole from "@/components/auth/RequireAdvocateRole";

/** Only advocate profile role can access /advocate/* (command center, messages, org tools). */
export default function AdvocateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAdvocateRole>{children}</RequireAdvocateRole>;
}
