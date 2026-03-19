import RequirePlatformAdmin from "@/components/auth/RequirePlatformAdmin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequirePlatformAdmin>{children}</RequirePlatformAdmin>;
}
