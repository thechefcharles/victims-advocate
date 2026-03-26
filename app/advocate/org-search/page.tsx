"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { PageHeader } from "@/components/layout/PageHeader";
import { SERVICE_TYPE_OPTIONS, CAPACITY_STATUS_OPTIONS, SPECIAL_POPULATION_OPTIONS, ACCESSIBILITY_FEATURE_OPTIONS } from "@/lib/organizations/profileOptions";
import { designationTierBadgeText, confidenceChipText } from "@/lib/trustDisplay";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";
import { NxtStpsVerifiedBadge } from "@/components/trust/NxtStpsVerifiedBadge";

type OrgResult = {
  id: string;
  name: string;
  service_types: string[];
  languages: string[];
  coverage_area: Record<string, unknown>;
  accepting_clients: boolean;
  capacity_status: string;
  lifecycle_status?: string;
  public_profile_status?: string;
  profile_stage: string;
  designation_tier: string | null;
  designation_confidence: string | null;
};

export default function AdvocateOrgSearchPage() {
  const { accessToken } = useAuth();
  const consentReady = useConsentRedirect(accessToken, ROUTES.advocateOrgSearch);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [service, setService] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [language, setLanguage] = useState("");
  const [availability, setAvailability] = useState("all");
  const [stage, setStage] = useState("all");
  const [specialPop, setSpecialPop] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<OrgResult[]>([]);
  const caseId = searchParams.get("case")?.trim() ?? "";

  useEffect(() => {
    const servicePrefill = searchParams.get("service")?.trim().toLowerCase() ?? "";
    const statePrefill = searchParams.get("state")?.trim().toUpperCase() ?? "";
    const langPrefill = searchParams.get("language")?.trim().toLowerCase() ?? "";
    if (servicePrefill) setService(servicePrefill);
    if (statePrefill) setStateCode(statePrefill);
    if (langPrefill) setLanguage(langPrefill);
  }, [searchParams]);

  const stateOptions = useMemo(
    () => [
      "",
      "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
    ],
    []
  );

  const runSearch = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const sp = new URLSearchParams();
      if (query.trim()) sp.set("q", query.trim());
      if (service) sp.set("service", service);
      if (stateCode) sp.set("state", stateCode);
      if (language.trim()) sp.set("language", language.trim().toLowerCase());
      if (availability !== "all") sp.set("availability", availability);
      if (stage !== "all") sp.set("stage", stage);
      if (specialPop) sp.set("special_population", specialPop);
      if (accessibility) sp.set("accessibility", accessibility);

      const res = await fetch(`/api/advocate/org-search?${sp.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Could not search organizations"));
        setResults([]);
        return;
      }
      setResults((json.data?.results ?? []) as OrgResult[]);
    } catch {
      setErr("Could not search organizations");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!consentReady) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentReady]);

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          contextLine="Advocate"
          eyebrow="Find organizations"
          title="Search organizations"
          subtitle="Internal casework search — filter by services, language, area, and availability. Not a public directory."
          backLink={{ href: ROUTES.advocateHome, label: "← My Dashboard" }}
        />

        {caseId ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
            Case-aware search is active. Use filters below, then open the case when you are ready to
            review organization fit.
            <span className="text-slate-500"> Case: {caseId.slice(0, 8)}…</span>
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <p className="text-xs text-slate-400">
            Internal only. Results default to matching-ready organizations (managed + publicly active; searchable or enriched).
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or service" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
            <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">Any service</option>
              {SERVICE_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
            </select>
            <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">Any state</option>
              {stateOptions.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Language (e.g. en, es)" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
            <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="all">Any availability</option>
              <option value="accepting">Accepting clients</option>
              {CAPACITY_STATUS_OPTIONS.filter((c) => c !== "unknown").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={stage} onChange={(e) => setStage(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="all">Any readiness stage</option>
              <option value="searchable">Searchable</option>
              <option value="enriched">Enriched</option>
            </select>
            <select value={specialPop} onChange={(e) => setSpecialPop(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">Any special population</option>
              {SPECIAL_POPULATION_OPTIONS.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
            </select>
            <select value={accessibility} onChange={(e) => setAccessibility(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">Any accessibility</option>
              {ACCESSIBILITY_FEATURE_OPTIONS.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={runSearch} className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500">Search</button>
            <button
              onClick={() => {
                setQuery(""); setService(""); setStateCode(""); setLanguage(""); setAvailability("all"); setStage("all"); setSpecialPop(""); setAccessibility("");
              }}
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Clear filters
            </button>
          </div>
        </section>

        {loading ? <p className="text-sm text-slate-400">Searching organizations…</p> : null}
        {err ? <p className="text-sm text-amber-200">{err}</p> : null}

        {!loading && !err && results.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-400 space-y-2">
            <p>No organizations match these filters.</p>
            <p className="text-xs text-slate-500">
              Try adjusting service, language, or area filters. Organizations must be publicly active and matching-ready to appear here.
            </p>
          </section>
        ) : null}

        {!loading && results.length > 0 ? (
          <ul className="space-y-3">
            {results.map((org) => (
              <li key={org.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{org.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                      Profile stage: {org.profile_stage}
                    </span>
                    <NxtStpsVerifiedBadge org={org} />
                    {org.designation_tier ? (
                      <span className="text-[10px] rounded-full border border-teal-700/50 px-2 py-0.5 text-teal-200">
                        {designationTierBadgeText(org.designation_tier) ?? org.designation_tier}
                        {org.designation_confidence ? ` · ${confidenceChipText(org.designation_confidence) ?? org.designation_confidence}` : ""}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Services: {org.service_types.length ? org.service_types.join(", ") : "—"}
                </p>
                <p className="text-xs text-slate-500">
                  Languages: {org.languages.length ? org.languages.join(", ") : "—"} · Availability:{" "}
                  {org.accepting_clients ? "accepting clients" : "not currently accepting"} · Capacity: {org.capacity_status}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/advocate/org?organization_id=${org.id}`} className="rounded-full border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800">
                    View organization
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}

