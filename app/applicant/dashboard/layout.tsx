import RequireApplicantRole from "@/components/auth/RequireApplicantRole";

export default function ApplicantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireApplicantRole>{children}</RequireApplicantRole>;
}
