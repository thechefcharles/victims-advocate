import RequireAdmin from "@/components/auth/RequireAdmin";

export default function CompensationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
