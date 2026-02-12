import RequireAdmin from "@/components/auth/RequireAdmin";

export default function AdvocateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
