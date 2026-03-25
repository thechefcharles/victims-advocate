"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { OrganizationCreationSection } from "@/components/org/OrganizationCreationSection";

/**
 * First-time setup for users with profile role organization and no org membership.
 * Routed from /dashboard after verify + consent (see getDashboardPath).
 */
export default function OrganizationSetupPage() {
  const router = useRouter();
  const { orgId, user } = useAuth();
  const { t } = useI18n();
  const [initialCatalogId, setInitialCatalogId] = useState<number | null>(null);
  const [initialOrgNameHint, setInitialOrgNameHint] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (orgId) router.replace("/organization/dashboard");
  }, [orgId, router]);

  useEffect(() => {
    if (!user || prefilled) return;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const raw = meta?.pending_org_catalog_entry_id;
    const pendingId =
      typeof raw === "number" && Number.isFinite(raw)
        ? raw
        : typeof raw === "string" && /^\d+$/.test(String(raw).trim())
          ? parseInt(String(raw).trim(), 10)
          : null;
    if (pendingId != null) setInitialCatalogId(pendingId);

    const hintRaw = meta?.org_onboarding_display_name_hint;
    if (typeof hintRaw === "string" && hintRaw.trim()) {
      setInitialOrgNameHint(hintRaw.trim());
    }

    setPrefilled(true);
  }, [user, prefilled]);

  if (orgId) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-400">Redirecting…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">
        <header>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-1">
            Organization setup
          </p>
          <h1 className="text-2xl font-semibold">Find or set up your organization</h1>
          <p className="text-sm text-slate-400 mt-2">
            Your personal account is ready. Next, connect your agency from the Illinois directory or
            submit it for approval if it&apos;s not listed. Nothing here recreates the signup step—you
            already have an account.
          </p>
        </header>

        <OrganizationCreationSection
          initialCatalogId={initialCatalogId}
          initialOrgNameHint={initialOrgNameHint}
          backLink={
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              {t("common.backToWorkspace")}
            </Link>
          }
        />
      </div>
    </main>
  );
}
