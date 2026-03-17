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
  profile_last_updated_at: string | null;
};

const QUICK_LANG = ["en", "es", "zh", "fr", "ar", "vi", "ko", "tl"] as const;

export default function AdvocateOrgPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"staff" | "supervisor" | "org_admin">("staff");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [myOrgRole, setMyOrgRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

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

  const canEditProfile =
    myOrgRole === "org_admin" || myOrgRole === "supervisor";

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
          setMyOrgRole(me?.org_role ?? null);
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
          setProfile(p);
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

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <Link
            href="/advocate"
            className="text-xs text-slate-400 hover:text-slate-200 mb-2 inline-block"
          >
            ← Back to advocate dashboard
          </Link>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Organization
          </p>
          <h1 className="text-2xl font-semibold">Manage organization</h1>
        </header>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Organization profile (matching / grading)
            </h2>
            {profile?.profile_last_updated_at && (
              <span className="text-xs text-slate-500">
                Last updated {formatDate(profile.profile_last_updated_at)}
              </span>
            )}
          </div>
          {!canEditProfile && myOrgRole && (
            <p className="text-xs text-amber-200/90">
              Your role ({myOrgRole}) can view this profile. Only org admin or supervisor can
              edit.
            </p>
          )}
          {profileLoading ? (
            <p className="text-sm text-slate-400">Loading profile…</p>
          ) : !profile ? (
            <p className="text-sm text-slate-400">No profile data.</p>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {profileMsg && (
                <p
                  className={
                    profileMsg.includes("saved")
                      ? "text-emerald-400"
                      : "text-amber-200"
                  }
                >
                  {profileMsg}
                </p>
              )}
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
                <label className="flex items-center gap-2 text-slate-300">
                  Profile status
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
              </div>
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
              <button
                type="submit"
                disabled={!canEditProfile || profileSaving}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-40"
              >
                {profileSaving ? "Saving…" : "Save profile"}
              </button>
            </form>
          )}
        </section>

        {inviteUrl && (
          <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm">
            <p className="font-medium text-emerald-200">Invite created</p>
            <p className="text-slate-300 mt-1 break-all">{inviteUrl}</p>
            <p className="text-xs text-slate-400 mt-1">
              Copy this link and send it to the invitee.
            </p>
          </div>
        )}

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
              onChange={(e) =>
                setInviteRole(e.target.value as "staff" | "supervisor" | "org_admin")
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="staff">Staff</option>
              <option value="supervisor">Supervisor</option>
              <option value="org_admin">Org Admin</option>
            </select>
            <button
              type="submit"
              disabled={submitting || !inviteEmail.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create invite"}
            </button>
          </form>
        </section>

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
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Revoke
                      </button>
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
            <p className="text-sm text-slate-400">No members yet.</p>
          ) : (
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
                      <button
                        type="button"
                        onClick={() => handleRevokeMember(m.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
