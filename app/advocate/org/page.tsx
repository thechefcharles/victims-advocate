"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import {
  ACCESSIBILITY_FEATURE_OPTIONS,
  CAPACITY_STATUS_OPTIONS,
  INTAKE_METHOD_OPTIONS,
  PROFILE_STATUS_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  SPECIAL_POPULATION_OPTIONS,
} from "@/lib/organizations/profileOptions";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  EMPTY_COPY,
  TRUST_LINK_HREF,
  TRUST_LINK_LABELS,
  TRUST_MICROCOPY,
  confidenceChipText,
  designationTierBadgeText,
  designationTrustBadgeClassName,
  formatReviewStatusLabel,
} from "@/lib/trustDisplay";
import type { OrgRole } from "@/lib/server/auth/orgRoles";
import { ORG_MEMBERSHIP_ROLES } from "@/lib/server/auth/orgRoles";
import { mapDbOrgRoleToSimple } from "@/lib/auth/simpleOrgRole";
import {
  listMissingForSearchable,
  listOptionalEnrichedHints,
} from "@/lib/organizations/profileStage";
import type { OrganizationProfile } from "@/lib/server/organizations/types";
import { NxtStpsVerifiedBadge } from "@/components/trust/NxtStpsVerifiedBadge";

const INVITE_ROLE_LABELS: Record<OrgRole, string> = {
  org_owner: "Org owner",
  program_manager: "Program manager",
  supervisor: "Supervisor",
  victim_advocate: "Victim advocate",
  intake_specialist: "Intake specialist",
  auditor: "Auditor",
};

type Member = {
  id: string;
  user_id: string;
  org_role: string;
  status: string;
  created_at: string;
  email?: string | null;
};

type Invite = {
  id: string;
  email: string;
  org_role: string;
  expires_at: string;
  created_at: string;
};

type OrgProfile = {
  id: string;
  name: string;
  type: string;
  status: string;
  lifecycle_status?: string;
  public_profile_status?: string;
  activation_submitted_at?: string | null;
  service_types: string[];
  languages: string[];
  coverage_area: Record<string, unknown>;
  intake_methods: string[];
  hours: Record<string, unknown>;
  accepting_clients: boolean;
  capacity_status: string;
  avg_response_time_hours: number | null;
  special_populations: string[];
  accessibility_features: string[];
  profile_status: string;
  profile_stage: string;
  profile_last_updated_at: string | null;
};

const QUICK_LANG = ["en", "es", "zh", "fr", "ar", "vi", "ko", "tl"] as const;

export default function AdvocateOrgPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("victim_advocate");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [myOrgRole, setMyOrgRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [activationSubmitting, setActivationSubmitting] = useState(false);
  const [activationMsg, setActivationMsg] = useState<string | null>(null);

  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [intakeMethods, setIntakeMethods] = useState<string[]>([]);
  const [specialPops, setSpecialPops] = useState<string[]>([]);
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [languagesQuick, setLanguagesQuick] = useState<string[]>([]);
  const [languagesExtra, setLanguagesExtra] = useState("");
  const [acceptingClients, setAcceptingClients] = useState(false);
  const [capacityStatus, setCapacityStatus] = useState("unknown");
  const [avgResponse, setAvgResponse] = useState("");
  const [profileStatus, setProfileStatus] = useState("draft");
  const [coverageJson, setCoverageJson] = useState("{}");
  const [hoursJson, setHoursJson] = useState("{}");

  const getToken = () => {
    return supabase.auth.getSession().then(({ data }) => data.session?.access_token);
  };

  const profileQuerySuffix = () => {
    if (typeof window === "undefined") return "";
    const orgId = new URL(window.location.href).searchParams.get("organization_id");
    return orgId ? `?organization_id=${encodeURIComponent(orgId)}` : "";
  };

  const canEditProfile = myOrgRole === "owner" || myOrgRole === "supervisor";
  const canManageOrg = canEditProfile;
  const canViewDesignation = true;
  const canManageMemberships = myOrgRole === "owner";
  const canManageReviews = canManageOrg;
  const canSubmitPublicActivation =
    myOrgRole === "owner" &&
    profile?.lifecycle_status === "managed" &&
    (profile?.public_profile_status === "draft" || profile?.public_profile_status === "paused") &&
    profile &&
    listMissingForSearchable(profile as OrganizationProfile).length === 0;

  const [designation, setDesignation] = useState<{
    designation_tier: string;
    designation_confidence: string;
    public_summary: string | null;
  } | null>(null);
  const [designationMsg, setDesignationMsg] = useState<string | null>(null);
  const [designationConfidenceNote, setDesignationConfidenceNote] = useState<string | null>(null);
  const [designationHints, setDesignationHints] = useState<string[]>([]);
  const [designationExplain, setDesignationExplain] = useState<{
    headline: string;
    bullets: string[];
  } | null>(null);
  const [reviewRequests, setReviewRequests] = useState<
    Array<{
      id: string;
      created_at: string;
      request_kind: string;
      subject: string;
      body: string;
      status: string;
      admin_response_org_visible: string | null;
      resolved_at: string | null;
    }>
  >([]);
  const [reviewKind, setReviewKind] = useState<"clarification" | "correction" | "data_update">(
    "clarification"
  );
  const [reviewSubject, setReviewSubject] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [orgSignals, setOrgSignals] = useState<{
    profile: { lastProfileUpdate: string | null; profileStage: string | null };
    cases: { active: number };
  } | null>(null);

  type OrgWorkspaceTab =
    | "profile"
    | "services"
    | "capacity"
    | "accessibility"
    | "members"
    | "designation"
    | "reviews";
  const [activeTab, setActiveTab] = useState<OrgWorkspaceTab>("profile");

  const orgTabs: { id: OrgWorkspaceTab; label: string }[] = [
    { id: "profile", label: "Organization profile" },
    { id: "services", label: "Services & languages" },
    { id: "capacity", label: "Capacity & availability" },
    { id: "accessibility", label: "Accessibility & populations" },
    { id: "members", label: "Members & invites" },
    { id: "designation", label: "Designation" },
    { id: "reviews", label: "Review requests" },
  ];

  useEffect(() => {
    if (!canViewDesignation || loading) return;
    const run = async () => {
      const token = await getToken();
      if (!token) return;
      const q = profileQuerySuffix();
      const res = await fetch(`/api/org/designation${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) return;
      const d = json.data?.designation ?? json.designation;
      const expl = json.data?.explanation;
      setDesignationConfidenceNote(json.data?.confidence_note ?? null);
      setDesignationHints(Array.isArray(json.data?.hints) ? (json.data.hints as string[]) : []);
      if (expl?.headline) {
        setDesignationExplain({ headline: expl.headline, bullets: expl.bullets ?? [] });
      }
      if (d) {
        setDesignation({
          designation_tier: d.designation_tier,
          designation_confidence: d.designation_confidence,
          public_summary: d.public_summary ?? null,
        });
        setDesignationMsg(null);
      } else {
        setDesignation(null);
        setDesignationMsg(json.data?.message ?? null);
      }
    };
    run();
  }, [canViewDesignation, loading, profileLoading]);

  useEffect(() => {
    if (!canManageOrg || loading) return;
    const run = async () => {
      const token = await getToken();
      if (!token) return;
      const q = profileQuerySuffix();
      const res = await fetch(`/api/org/signals${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setOrgSignals(null);
        return;
      }
      setOrgSignals((json.data?.signals as { profile: { lastProfileUpdate: string | null; profileStage: string | null }; cases: { active: number } }) ?? null);
    };
    run();
  }, [canManageOrg, loading, profileLoading]);

  const loadReviewRequests = async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/org/designation/review-requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    setReviewRequests(json.data?.requests ?? []);
  };

  useEffect(() => {
    if (!canViewDesignation || loading) return;
    loadReviewRequests();
  }, [canViewDesignation, loading]);

  const submitReviewRequest = async (e: FormEvent) => {
    e.preventDefault();
    const sub = reviewSubject.trim();
    const bod = reviewBody.trim();
    if (sub.length < 5 || bod.length < 20) {
      setReviewMsg("Subject (5+) and details (20+ characters) required.");
      return;
    }
    setReviewSubmitting(true);
    setReviewMsg(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/org/designation/review-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request_kind: reviewKind,
          subject: sub,
          body: bod,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setReviewMsg(getApiErrorMessage(json, "Could not submit request"));
        return;
      }
      setReviewSubject("");
      setReviewBody("");
      setReviewMsg("Request submitted. Platform staff will respond in writing.");
      await loadReviewRequests();
    } finally {
      setReviewSubmitting(false);
    }
  };

  const withdrawReview = async (id: string) => {
    if (!confirm("Withdraw this request?")) return;
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/org/designation/review-request/${id}/withdraw`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) await loadReviewRequests();
  };

  const loadMembers = async (token: string) => {
    const { searchParams } = new URL(window.location.href);
    const orgId = searchParams.get("organization_id");
    const url = orgId ? `/api/org/members?organization_id=${orgId}` : "/api/org/members";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Failed to load members"));
    }
    const json = await res.json();
    return (json.data?.members ?? []) as Member[];
  };

  const loadInvites = async (token: string) => {
    const { searchParams } = new URL(window.location.href);
    const orgId = searchParams.get("organization_id");
    const url = orgId ? `/api/org/invites?organization_id=${orgId}` : "/api/org/invites";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.invites ?? [];
  };

  useEffect(() => {
    const run = async () => {
      const token = await getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const uid = user?.id;

        const [m, inv] = await Promise.all([loadMembers(token), loadInvites(token)]);
        setMembers(m);
        setInvites(inv);
        if (uid) {
          const me = m.find((x) => x.user_id === uid);
          setMyOrgRole(mapDbOrgRoleToSimple(me?.org_role ?? null));
        }
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setMembers([]);
        setInvites([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      setProfileLoading(true);
      setProfileMsg(null);
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(`/api/org/profile${profileQuerySuffix()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(getApiErrorMessage(json, "Failed to load org profile"));
        }
        const p = json.data?.profile as OrgProfile | undefined;
        if (p) {
          setProfile({
            ...p,
            profile_stage: p.profile_stage ?? "created",
            lifecycle_status: p.lifecycle_status,
            public_profile_status: p.public_profile_status,
            activation_submitted_at: p.activation_submitted_at ?? null,
          });
          setServiceTypes(p.service_types ?? []);
          setIntakeMethods(p.intake_methods ?? []);
          setSpecialPops(p.special_populations ?? []);
          setAccessibility(p.accessibility_features ?? []);
          const langs = p.languages ?? [];
          const quick = langs.filter((l) => QUICK_LANG.includes(l as (typeof QUICK_LANG)[number]));
          const extra = langs.filter((l) => !QUICK_LANG.includes(l as (typeof QUICK_LANG)[number]));
          setLanguagesQuick(quick);
          setLanguagesExtra(extra.join(", "));
          setAcceptingClients(Boolean(p.accepting_clients));
          setCapacityStatus(p.capacity_status || "unknown");
          setAvgResponse(
            p.avg_response_time_hours != null ? String(p.avg_response_time_hours) : ""
          );
          setProfileStatus(p.profile_status || "draft");
          setCoverageJson(JSON.stringify(p.coverage_area ?? {}, null, 2));
          setHoursJson(JSON.stringify(p.hours ?? {}, null, 2));
        }
      } catch (e) {
        setProfileMsg(e instanceof Error ? e.message : "Profile load failed");
      } finally {
        setProfileLoading(false);
      }
    };
    run();
  }, [loading]);

  const toggleInSet = (arr: string[], v: string, set: (x: string[]) => void) => {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else set([...arr, v]);
  };

  const handleSubmitForPublicActivation = async () => {
    setActivationMsg(null);
    setActivationSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/org/submit-for-review", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setActivationMsg(getApiErrorMessage(json, "Could not submit for review"));
        return;
      }
      const p = json.data?.profile as OrgProfile | undefined;
      if (p) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                ...p,
                public_profile_status: p.public_profile_status ?? "pending_review",
                activation_submitted_at: p.activation_submitted_at ?? prev.activation_submitted_at,
              }
            : prev
        );
      } else {
        setProfile((prev) =>
          prev ? { ...prev, public_profile_status: "pending_review" } : prev
        );
      }
      setActivationMsg(null);
    } finally {
      setActivationSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEditProfile) return;
    const token = await getToken();
    if (!token) return;
    let coverage: Record<string, unknown>;
    let hours: Record<string, unknown>;
    try {
      coverage = JSON.parse(coverageJson || "{}");
      if (typeof coverage !== "object" || coverage === null || Array.isArray(coverage)) {
        throw new Error("coverage must be a JSON object");
      }
    } catch {
      setProfileMsg("Coverage area: invalid JSON object");
      return;
    }
    try {
      hours = JSON.parse(hoursJson || "{}");
      if (typeof hours !== "object" || hours === null || Array.isArray(hours)) {
        throw new Error("hours must be a JSON object");
      }
    } catch {
      setProfileMsg("Hours: invalid JSON object");
      return;
    }
    const extraLangs = languagesExtra
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const languages = [...new Set([...languagesQuick, ...extraLangs])];

    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch(`/api/org/profile${profileQuerySuffix()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_types: serviceTypes,
          intake_methods: intakeMethods,
          special_populations: specialPops,
          accessibility_features: accessibility,
          languages,
          coverage_area: coverage,
          hours,
          accepting_clients: acceptingClients,
          capacity_status: capacityStatus,
          avg_response_time_hours: avgResponse.trim() === "" ? null : Number(avgResponse),
          profile_status: profileStatus,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setProfileMsg(getApiErrorMessage(json, "Save failed"));
        return;
      }
      const p = json.data?.profile as OrgProfile | undefined;
      if (p) setProfile(p);
      setProfileMsg("Profile saved.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    const token = await getToken();
    if (!token) return;
    setSubmitting(true);
    setInviteUrl(null);
    try {
      const res = await fetch("/api/org/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, org_role: inviteRole, expiry_days: 7 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to create invite"));
        return;
      }
      const url = json.data?.invite?.accept_url;
      if (url) {
        setInviteUrl(url);
        setInviteEmail("");
      }
      setErr(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Revoke this invite?")) return;
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/org/invites/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ invite_id: inviteId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to revoke invite"));
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setErr(null);
  };

  const handleRevokeMember = async (membershipId: string) => {
    if (!confirm("Revoke this member?")) return;
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/org/members/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ membership_id: membershipId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to revoke"));
      return;
    }
    const m = members.filter((x) => x.id !== membershipId);
    setMembers(m);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  const visibleTabs = orgTabs.filter((t) => {
    if (t.id === "members" || t.id === "reviews") return canManageOrg;
    if (t.id === "designation") return canViewDesignation;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          contextLine="Advocate → Organization"
          eyebrow="Organization"
          title="Organization workspace"
          subtitle="Keep your organization profile current, review profile stage for matching, and track designation confidence."
          meta="This workspace is for your team’s structured profile and trust on NxtStps—not public reviews."
          backLink={{ href: ROUTES.advocateHome, label: "← My Dashboard" }}
        />

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        {profile && !profileLoading ? (
          <div className="flex flex-wrap items-center gap-2">
            <NxtStpsVerifiedBadge
              org={{
                lifecycle_status: profile.lifecycle_status ?? null,
                public_profile_status: profile.public_profile_status ?? null,
              }}
            />
          </div>
        ) : null}

        {profile && !profileLoading && profile.public_profile_status === "draft" && (
          <div className="rounded-xl border border-slate-600/60 bg-slate-900/50 px-4 py-3 text-sm text-slate-300 space-y-2">
            <p className="text-slate-200 font-medium">Public visibility</p>
            <p>
              Your organization is not yet public on NxtStps. After your profile meets the basics below,
              you can submit it for platform review.
            </p>
            {canSubmitPublicActivation ? (
              <button
                type="button"
                onClick={() => void handleSubmitForPublicActivation()}
                disabled={activationSubmitting}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {activationSubmitting ? "Submitting…" : "Submit for Review"}
              </button>
            ) : myOrgRole === "owner" ? (
              <p className="text-xs text-slate-500">
                {profile.lifecycle_status !== "managed"
                  ? "Ownership must be confirmed before you can request public activation."
                  : "Complete services, languages, coverage area, and capacity to enable submit."}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Only an organization owner can submit for public review.
              </p>
            )}
            {activationMsg && (
              <p className="text-xs text-amber-200/90">{activationMsg}</p>
            )}
          </div>
        )}

        {profile && !profileLoading && profile.public_profile_status === "pending_review" && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/95">
            <p className="font-medium text-amber-50">Your organization is under review</p>
            <p className="mt-1 text-amber-100/85">
              A platform administrator is reviewing your request for public visibility. You can keep updating
              your team and profile unless you are asked to pause.
            </p>
          </div>
        )}

        {profile && !profileLoading && profile.public_profile_status === "paused" && (
          <div className="rounded-xl border border-slate-600/60 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
            <p className="font-medium text-slate-200">Your organization is currently not visible</p>
            <p className="mt-1 text-slate-400">
              Public listing is paused. Contact support or use org tools if you need this changed.
            </p>
            {canSubmitPublicActivation && (
              <button
                type="button"
                onClick={() => void handleSubmitForPublicActivation()}
                disabled={activationSubmitting}
                className="mt-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {activationSubmitting ? "Submitting…" : "Submit for Review"}
              </button>
            )}
            {activationMsg && (
              <p className="mt-2 text-xs text-amber-200/90">{activationMsg}</p>
            )}
          </div>
        )}

        <nav
          className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3"
          aria-label="Organization sections"
        >
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeTab === t.id
                  ? "bg-blue-900/40 text-blue-100 border border-blue-500/40"
                  : "bg-slate-900/70 text-slate-400 border border-slate-700/80 hover:border-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {profile && !profileLoading && (
          <section
            className="rounded-2xl border border-slate-700/80 bg-slate-900/40 p-4 text-sm text-slate-200 space-y-2"
            aria-label="Profile stage for matching"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Profile stage
            </p>
            {profile.profile_stage === "created" && (
              <>
                <p className="text-slate-300">
                  <span className="font-semibold text-slate-100">Created.</span> Add the basics below
                  so your organization can become searchable for support matching.
                </p>
                {listMissingForSearchable(profile as OrganizationProfile).length > 0 && (
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                    {listMissingForSearchable(profile as OrganizationProfile).map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {profile.profile_stage === "searchable" && (
              <>
                <p className="text-slate-300">
                  <span className="font-semibold text-slate-100">Searchable.</span> When your profile
                  status is Active, your organization can appear in support matching.
                </p>
                {listOptionalEnrichedHints(profile as OrganizationProfile).length > 0 && (
                  <p className="text-xs text-slate-500">
                    You can add more detail any time:{" "}
                    {listOptionalEnrichedHints(profile as OrganizationProfile).join(" · ")}
                  </p>
                )}
              </>
            )}
            {profile.profile_stage === "enriched" && (
              <p className="text-slate-300">
                <span className="font-semibold text-slate-100">Enriched.</span> Your profile includes
                extra information that helps build confidence over time.
              </p>
            )}
            {!["created", "searchable", "enriched"].includes(profile.profile_stage) && (
              <p className="text-xs text-slate-400">
                Current stage: {profile.profile_stage}. Save your profile to refresh this label.
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              Stages update when you save. Matching also requires profile status set to Active.
            </p>
          </section>
        )}

        {profile && !profileLoading && canManageOrg && (
          <section className="rounded-2xl border border-slate-700/70 bg-slate-900/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Org health snapshot
            </p>
            <p className="text-sm text-slate-300">
              Stage: <span className="text-slate-100 font-medium">{profile.profile_stage}</span>
              {" · "}
              Last profile update:{" "}
              <span className="text-slate-100 font-medium">
                {formatDate(
                  orgSignals?.profile.lastProfileUpdate ?? profile.profile_last_updated_at ?? undefined
                )}
              </span>
              {orgSignals?.cases?.active != null ? (
                <>
                  {" · "}Active cases:{" "}
                  <span className="text-slate-100 font-medium">{orgSignals.cases.active}</span>
                </>
              ) : null}
            </p>
            <p className="text-xs text-slate-400">
              {!["searchable", "enriched"].includes(profile.profile_stage)
                ? "Complete required profile fields to become searchable."
                : designation?.designation_confidence === "low"
                  ? "Keep profile details current and use core workflows consistently to improve signal reliability over time."
                  : "Your organization profile is in good shape. Keep services and capacity current."}
            </p>
            {designationConfidenceNote && (
              <p className="text-xs text-slate-500">{designationConfidenceNote}</p>
            )}
          </section>
        )}

        {/* Profile form — tabs profile → accessibility */}
        <form id="org-profile-form" onSubmit={handleSaveProfile} className="space-y-0">
          {profileMsg && (
            <p
              className={`text-sm mb-4 ${
                profileMsg.includes("saved") ? "text-emerald-400" : "text-amber-200"
              }`}
            >
              {profileMsg}
            </p>
          )}
          {!canEditProfile && myOrgRole && (
            <p className="text-xs text-amber-200/90 mb-4">
              Your role ({myOrgRole}) can view this profile. Only an org owner or supervisor can
              edit.
            </p>
          )}
          {canEditProfile && (
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Some updates may be reviewed by NxtStps for trust and accuracy. Routine details (hours,
              capacity, languages, and similar) save immediately.
            </p>
          )}
          {profileLoading ? (
            <p className="text-sm text-slate-400">Loading profile…</p>
          ) : !profile ? (
            <p className="text-sm text-slate-400">No profile data.</p>
          ) : (
            <>
              <div className={activeTab !== "profile" ? "hidden" : "space-y-4"}>
                <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-200">Organization profile</h2>
                    {profile.profile_last_updated_at && (
                      <span className="text-xs text-slate-500">
                        Last updated {formatDate(profile.profile_last_updated_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Basic identity and profile status. Matching fields are saved with your other
                    profile settings.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-slate-500 uppercase text-[10px] tracking-wide">Name</p>
                      <p className="text-slate-200">{profile.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-[10px] tracking-wide">Type</p>
                      <p className="text-slate-200">{profile.type}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase text-[10px] tracking-wide">
                        Organization status
                      </p>
                      <p className="text-slate-200">{profile.status}</p>
                    </div>
                  </div>
                  <label className="flex flex-wrap items-center gap-2 text-slate-300">
                    Profile status (for matching)
                    <select
                      disabled={!canEditProfile}
                      value={profileStatus}
                      onChange={(e) => setProfileStatus(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                    >
                      {PROFILE_STATUS_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
              </div>

              <div className={activeTab !== "services" ? "hidden" : "space-y-4"}>
                <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 text-xs">
                  <h2 className="text-sm font-semibold text-slate-200">Services & languages</h2>
                  <p className="text-[11px] text-slate-500">
                    Service types, languages, and how survivors reach you.
                  </p>
              <div>
                <p className="text-slate-400 mb-2">Service types</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                    >
                      <input
                        type="checkbox"
                        disabled={!canEditProfile}
                        checked={serviceTypes.includes(opt)}
                        onChange={() => toggleInSet(serviceTypes, opt, setServiceTypes)}
                        className="rounded border-slate-600"
                      />
                      {opt.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 mb-2">Languages (ISO-style, e.g. en, es)</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {QUICK_LANG.map((code) => (
                    <label
                      key={code}
                      className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                    >
                      <input
                        type="checkbox"
                        disabled={!canEditProfile}
                        checked={languagesQuick.includes(code)}
                        onChange={() =>
                          toggleInSet(languagesQuick, code, setLanguagesQuick)
                        }
                        className="rounded border-slate-600"
                      />
                      {code}
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  disabled={!canEditProfile}
                  placeholder="Other codes, comma-separated (e.g. pt, ht)"
                  value={languagesExtra}
                  onChange={(e) => setLanguagesExtra(e.target.value)}
                  className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <p className="text-slate-400 mb-2">Intake methods</p>
                <div className="flex flex-wrap gap-2">
                  {INTAKE_METHOD_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                    >
                      <input
                        type="checkbox"
                        disabled={!canEditProfile}
                        checked={intakeMethods.includes(opt)}
                        onChange={() => toggleInSet(intakeMethods, opt, setIntakeMethods)}
                        className="rounded border-slate-600"
                      />
                      {opt.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </div>
                </section>
              </div>

              <div className={activeTab !== "capacity" ? "hidden" : "space-y-4"}>
                <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 text-xs">
                  <h2 className="text-sm font-semibold text-slate-200">Capacity & availability</h2>
                  <p className="text-[11px] text-slate-500">
                    Whether you are accepting clients, response expectations, and coverage / hours.
                  </p>
              <div className="flex flex-wrap gap-6 items-center">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditProfile}
                    checked={acceptingClients}
                    onChange={(e) => setAcceptingClients(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  Accepting clients
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  Capacity
                  <select
                    disabled={!canEditProfile}
                    value={capacityStatus}
                    onChange={(e) => setCapacityStatus(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                  >
                    {CAPACITY_STATUS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  Avg response (hours)
                  <input
                    type="number"
                    min={0}
                    max={8760}
                    disabled={!canEditProfile}
                    placeholder="—"
                    value={avgResponse}
                    onChange={(e) => setAvgResponse(e.target.value)}
                    className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                  />
                </label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 mb-1">Coverage area (JSON)</p>
                  <textarea
                    disabled={!canEditProfile}
                    value={coverageJson}
                    onChange={(e) => setCoverageJson(e.target.value)}
                    rows={6}
                    className="w-full font-mono rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Hours (JSON)</p>
                  <textarea
                    disabled={!canEditProfile}
                    value={hoursJson}
                    onChange={(e) => setHoursJson(e.target.value)}
                    rows={6}
                    className="w-full font-mono rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>
                </section>
              </div>

              <div className={activeTab !== "accessibility" ? "hidden" : "space-y-4"}>
                <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 text-xs">
                  <h2 className="text-sm font-semibold text-slate-200">Accessibility & populations</h2>
                  <p className="text-[11px] text-slate-500">
                    Populations you serve and accessibility accommodations you offer.
                  </p>
              <div>
                <p className="text-slate-400 mb-2">Special populations</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIAL_POPULATION_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                    >
                      <input
                        type="checkbox"
                        disabled={!canEditProfile}
                        checked={specialPops.includes(opt)}
                        onChange={() => toggleInSet(specialPops, opt, setSpecialPops)}
                        className="rounded border-slate-600"
                      />
                      {opt.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 mb-2">Accessibility</p>
                <div className="flex flex-wrap gap-2">
                  {ACCESSIBILITY_FEATURE_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                    >
                      <input
                        type="checkbox"
                        disabled={!canEditProfile}
                        checked={accessibility.includes(opt)}
                        onChange={() => toggleInSet(accessibility, opt, setAccessibility)}
                        className="rounded border-slate-600"
                      />
                      {opt.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </div>
                </section>
              </div>

              {["profile", "services", "capacity", "accessibility"].includes(activeTab) && (
                <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
                  <button
                    type="submit"
                    disabled={!canEditProfile || profileSaving}
                    className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-40"
                  >
                    {profileSaving ? "Saving…" : "Save profile"}
                  </button>
                </div>
              )}
            </>
          )}
        </form>

        {canManageOrg && activeTab === "members" && (
          <>
        {inviteUrl && (
          <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm">
            <p className="font-medium text-emerald-200">Invite created</p>
            <p className="text-slate-300 mt-1 break-all">{inviteUrl}</p>
            <p className="text-xs text-slate-400 mt-1">
              Copy this link and send it to the invitee.
            </p>
          </div>
        )}

        {canManageMemberships && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Invite member
          </h2>
          <form onSubmit={handleCreateInvite} className="flex flex-wrap gap-3">
            <input
              type="email"
              placeholder="Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 w-64"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {ORG_MEMBERSHIP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {INVITE_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting || !inviteEmail.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create invite"}
            </button>
          </form>
        </section>
        )}

        {invites.length === 0 && !loading && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Pending invites</h2>
            <p className="text-xs text-slate-500 mb-3">
              No pending invites. Invite staff or supervisors when you&apos;re ready to grow your
              team.
            </p>
          </section>
        )}

        {invites.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Pending invites</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Expires</th>
                  <th className="text-left py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-900">
                    <td className="py-2 text-slate-200">{inv.email}</td>
                    <td className="py-2 text-slate-300">{inv.org_role}</td>
                    <td className="py-2 text-slate-400">{formatDate(inv.expires_at)}</td>
                    <td className="py-2">
                      {canManageMemberships ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Members</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-400">
              No members yet. When someone accepts an invite, they&apos;ll appear here.
            </p>
          ) : (
            <>
              {members.length === 1 && (
                <p className="text-xs text-slate-500 mb-3">
                  You&apos;re the only member listed so far. Invite teammates to share the workload.
                </p>
              )}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="text-left py-2">Email / User</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Joined</th>
                    <th className="text-left py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-slate-900">
                      <td className="py-2 text-slate-200">
                        {m.email || m.user_id.slice(0, 8) + "…"}
                      </td>
                      <td className="py-2 text-slate-300">{m.org_role}</td>
                      <td className="py-2 text-slate-400">{formatDate(m.created_at)}</td>
                      <td className="py-2">
                        {canManageMemberships ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeMember(m.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
          </>
        )}

        {canViewDesignation && activeTab === "designation" && (
          <section className="rounded-2xl border border-teal-900/40 bg-slate-950/70 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-teal-200/90">Designation</h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {TRUST_MICROCOPY.designationNotRating} {TRUST_MICROCOPY.designationSmallSignal}
            </p>
            <p className="text-[11px]">
              <Link
                href={TRUST_LINK_HREF.designations}
                className="text-teal-400 hover:text-teal-300 underline"
              >
                {TRUST_LINK_LABELS.aboutDesignations}
              </Link>
            </p>
            {designation ? (
              <>
                <div className="flex flex-wrap items-baseline gap-2">
                  {designationTierBadgeText(designation.designation_tier) && (
                    <span className={designationTrustBadgeClassName()}>
                      {designationTierBadgeText(designation.designation_tier)}
                    </span>
                  )}
                  {confidenceChipText(designation.designation_confidence) && (
                    <span className="text-[10px] text-slate-500">
                      {confidenceChipText(designation.designation_confidence)}
                    </span>
                  )}
                </div>
                {designation.designation_tier === "insufficient_data" && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {EMPTY_COPY.insufficientDataDesignation}
                  </p>
                )}
                {designationExplain && (
                  <div className="mt-2 text-xs text-slate-400 border-t border-slate-800 pt-3">
                    <p className="font-medium text-slate-300">{designationExplain.headline}</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {designationExplain.bullets.slice(0, 5).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {designation.public_summary && (
                  <p className="text-sm text-slate-300 leading-relaxed mt-2">
                    {designation.public_summary}
                  </p>
                )}
                {designationConfidenceNote && (
                  <p className="text-xs text-slate-400 mt-2">{designationConfidenceNote}</p>
                )}
                {designationHints.length > 0 && (
                  <div className="mt-2 text-xs text-slate-400">
                    <p className="font-medium text-slate-300">Improving reliability over time</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {designationHints.slice(0, 4).map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 leading-relaxed">
                {designationMsg ?? EMPTY_COPY.noDesignationYet}
              </p>
            )}
          </section>
        )}

        {canManageReviews && activeTab === "reviews" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">Designation review requests</h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Use this form for formal clarification or correction requests. Staff respond in writing;
              numeric scores are not shared.{" "}
              <Link href={TRUST_LINK_HREF.designations} className="text-teal-400/90 hover:underline">
                {TRUST_LINK_LABELS.aboutDesignations}
              </Link>
            </p>
            {reviewMsg && (
              <p
                className={
                  reviewMsg.includes("submitted") ? "text-emerald-400 text-xs" : "text-amber-200 text-xs"
                }
              >
                {reviewMsg}
              </p>
            )}
            <form onSubmit={submitReviewRequest} className="space-y-2 text-xs">
              <select
                value={reviewKind}
                onChange={(e) =>
                  setReviewKind(e.target.value as "clarification" | "correction" | "data_update")
                }
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 w-full max-w-xs"
              >
                <option value="clarification">Clarification</option>
                <option value="correction">Correction</option>
                <option value="data_update">Data / platform use update</option>
              </select>
              <input
                type="text"
                placeholder="Short subject"
                value={reviewSubject}
                onChange={(e) => setReviewSubject(e.target.value)}
                className="w-full max-w-lg rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
              />
              <textarea
                placeholder="Describe your request (20+ characters)"
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={4}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
              />
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="rounded bg-slate-700 px-3 py-1.5 text-white hover:bg-slate-600 disabled:opacity-50"
              >
                {reviewSubmitting ? "Submitting…" : "Submit request"}
              </button>
            </form>
            {reviewRequests.length === 0 && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{EMPTY_COPY.noReviewRequests}</p>
            )}

            {reviewRequests.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Request history
                </p>
                <ul className="space-y-3 text-xs">
                  {reviewRequests.map((r) => (
                    <li
                      key={r.id}
                      className="border border-slate-800 rounded-lg p-3 sm:p-4 bg-slate-900/50 space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold text-slate-100 leading-snug">{r.subject}</p>
                          <p className="text-[10px] text-slate-500">
                            Submitted {formatDate(r.created_at)} · {r.request_kind.replace(/_/g, " ")}
                          </p>
                        </div>
                        <span className="shrink-0 inline-flex rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                          {formatReviewStatusLabel(r.status)}
                        </span>
                      </div>
                      <p className="text-slate-400 whitespace-pre-wrap text-[11px] leading-relaxed border-t border-slate-800/80 pt-2">
                        {r.body}
                      </p>
                      {r.admin_response_org_visible && (
                        <div className="rounded-md border border-slate-700/80 bg-slate-950/60 px-3 py-2">
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                            Staff response (visible to your org)
                          </p>
                          <p className="text-slate-300 whitespace-pre-wrap text-[11px] leading-relaxed">
                            {r.admin_response_org_visible}
                          </p>
                        </div>
                      )}
                      {(r.status === "pending" || r.status === "in_review") && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => withdrawReview(r.id)}
                            className="text-[11px] font-medium text-red-400/90 hover:text-red-300"
                          >
                            Withdraw request
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
