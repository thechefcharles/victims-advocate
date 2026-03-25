"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { OrganizationOnboarding } from "@/components/org/OrganizationOnboarding";

/**
 * Organization leader onboarding: directory find/join + pending proposal.
 * Not available to survivor or advocate accounts (except platform admins).
 */
export default function OrganizationSetupPage() {
  const router = useRouter();
  const { orgId, user, loading, role, realRole, isAdmin } = useAuth();
  const { t } = useI18n();
  const [initialCatalogId, setInitialCatalogId] = useState<number | null>(null);
  const [initialOrgNameHint, setInitialOrgNameHint] = useState<string | null>(null);
  const [initialLeaderTitleHint, setInitialLeaderTitleHint] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const profileRole = realRole ?? role;

  useEffect(() => {
    if (orgId) router.replace("/organization/dashboard");
  }, [orgId, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (isAdmin) return;
    if (profileRole === "victim") {
      router.replace("/victim/dashboard");
      return;
    }
    if (profileRole === "advocate") {
      router.replace("/advocate");
      return;
    }
  }, [loading, user, profileRole, isAdmin, router]);

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

    const titleRaw = meta?.org_onboarding_leader_title;
    if (typeof titleRaw === "string" && titleRaw.trim()) {
      setInitialLeaderTitleHint(titleRaw.trim());
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

  if (!loading && user && !isAdmin && (profileRole === "victim" || profileRole === "advocate")) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-400">Redirecting…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Organization onboarding</p>
          <h1 className="text-2xl font-semibold text-slate-50">Find Or Set Up Your Organization</h1>
          <p className="text-sm text-slate-400">
            Choose the option that best matches your organization.
          </p>
        </header>

        <OrganizationOnboarding
          initialCatalogId={initialCatalogId}
          initialOrgNameHint={initialOrgNameHint}
          initialLeaderTitleHint={initialLeaderTitleHint}
          backLink={
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-slate-200 inline-block"
            >
              {t("common.backToWorkspace")}
            </Link>
          }
        />
      </div>
    </main>
  );
}
