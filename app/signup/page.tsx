import { SignupPageClient, type SignupAccountType } from "./SignupPageClient";

function parseIntent(raw: string | string[] | undefined): SignupAccountType {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "applicant") return "victim";
  if (v === "advocate" || v === "organization" || v === "victim") return v;
  return "victim";
}

type PageProps = {
  searchParams?: Promise<{ intent?: string | string[] }>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  return <SignupPageClient initialAccountType={parseIntent(sp.intent)} />;
}
