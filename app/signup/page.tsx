import { SignupPageClient, type SignupAccountType } from "./SignupPageClient";

function parseIntent(raw: string | string[] | undefined): SignupAccountType {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "applicant" || v === "victim") return "victim";
  if (v === "provider" || v === "advocate") return "advocate";
  if (v === "organization") return "organization";
  return "victim";
}

type PageProps = {
  searchParams?: Promise<{ intent?: string | string[] }>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  return <SignupPageClient initialAccountType={parseIntent(sp.intent)} />;
}
