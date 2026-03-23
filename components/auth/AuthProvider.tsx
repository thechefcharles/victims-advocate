"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  parsePersonalInfo,
  type AdvocatePersonalInfo,
  type VictimPersonalInfo,
} from "@/lib/personalInfo";

export type ProfileRole = "victim" | "advocate" | "organization";

export type OrgRole = "staff" | "supervisor" | "org_admin" | null;

export type AccountStatus = "active" | "disabled" | "deleted";

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  role: ProfileRole;
  /** For admins: underlying profile role when using "view as". */
  realRole: ProfileRole | null;
  isAdmin: boolean;
  /** Active org membership (one org per user in current schema). */
  orgId: string | null;
  orgRole: OrgRole;
  /** Illinois victim assistance directory program id (profile / advocate). */
  affiliatedCatalogEntryId: number | null;
  /** Directory id linked to the user's org record (org admins). */
  organizationCatalogEntryId: number | null;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  /** Victim-only: account personal_info from GET /api/me. */
  personalInfo: VictimPersonalInfo | null;
  /** Advocate-only: profiles.personal_info.advocate from GET /api/me. */
  advocatePersonalInfo: AdvocatePersonalInfo | null;
  /** When advocate belongs to an org — display name from organizations.name. */
  organizationName: string | null;
  /** Refetch /api/me and update role (e.g. after admin "view as" change). */
  refetchMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [roleFromMetadata, setRoleFromMetadata] = useState<ProfileRole>("victim");
  const [roleFromApi, setRoleFromApi] = useState<ProfileRole | null>(null);
  const [realRoleFromApi, setRealRoleFromApi] = useState<ProfileRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<OrgRole>(null);
  const [affiliatedCatalogEntryId, setAffiliatedCatalogEntryId] = useState<number | null>(null);
  const [organizationCatalogEntryId, setOrganizationCatalogEntryId] = useState<number | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");
  const [personalInfo, setPersonalInfo] = useState<VictimPersonalInfo | null>(null);
  const [advocatePersonalInfo, setAdvocatePersonalInfo] = useState<AdvocatePersonalInfo | null>(
    null
  );
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  /** Copy signup `preferred_name` from user_metadata into profiles.personal_info once. */
  const signupPreferredNameSyncedRef = useRef(false);
  /** Reset /api/me state only when user id changes — not on every token refresh (was clearing role and hiding victim UI). */
  const resolvedUserIdForMeRef = useRef<string | null>(null);

  const applyMePayload = useCallback((d: Record<string, unknown>) => {
    if (d?.role === "victim" || d?.role === "advocate" || d?.role === "organization") {
      setRoleFromApi(d.role as ProfileRole);
    }
    if (
      d?.realRole === "victim" ||
      d?.realRole === "advocate" ||
      d?.realRole === "organization"
    ) {
      setRealRoleFromApi(d.realRole as ProfileRole);
    }
    if (typeof d?.emailVerified === "boolean") setEmailVerified(d.emailVerified);
    if (d?.accountStatus) setAccountStatus(d.accountStatus as AccountStatus);
    setIsAdmin(d?.isAdmin === true);
    setOrgId(typeof d?.orgId === "string" ? d.orgId : null);
    const or = d?.orgRole;
    setOrgRole(or === "staff" || or === "supervisor" || or === "org_admin" ? or : null);
    const aff = d?.affiliatedCatalogEntryId;
    setAffiliatedCatalogEntryId(
      typeof aff === "number" && Number.isFinite(aff) ? aff : null
    );
    const orgCat = d?.organizationCatalogEntryId;
    setOrganizationCatalogEntryId(
      typeof orgCat === "number" && Number.isFinite(orgCat) ? orgCat : null
    );

    if (d?.role === "victim") {
      setPersonalInfo(parsePersonalInfo(d.personalInfo));
      setAdvocatePersonalInfo(null);
      setOrganizationName(null);
    } else if (d?.role === "advocate") {
      setPersonalInfo(null);
      const rawAdv = d.advocatePersonalInfo;
      setAdvocatePersonalInfo(
        rawAdv && typeof rawAdv === "object" ? (rawAdv as AdvocatePersonalInfo) : null
      );
      setOrganizationName(typeof d.organizationName === "string" ? d.organizationName : null);
    } else {
      setPersonalInfo(null);
      setAdvocatePersonalInfo(null);
      setOrganizationName(null);
    }
  }, []);

  const role = roleFromApi ?? roleFromMetadata;
  const realRoleResolved =
    realRoleFromApi ?? roleFromApi ?? roleFromMetadata;

  /** When /api/me fails, drop server-derived role so roleFromMetadata (JWT) is used — avoids stale advocate/org after profile fixes or after 401. */
  const clearMeFromApi = useCallback(() => {
    setRoleFromApi(null);
    setRealRoleFromApi(null);
    setAffiliatedCatalogEntryId(null);
    setOrganizationCatalogEntryId(null);
    setPersonalInfo(null);
    setAdvocatePersonalInfo(null);
    setOrganizationName(null);
  }, []);

  const refetchMe = useCallback(async () => {
    const token = session?.access_token ?? null;
    if (!token) return;
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const data = (json?.data ?? json) as Record<string, unknown>;
        applyMePayload(data);
      } else {
        clearMeFromApi();
      }
    } catch {
      clearMeFromApi();
    }
  }, [session?.access_token, applyMePayload, clearMeFromApi]);

  useEffect(() => {
    if (!session?.user) {
      signupPreferredNameSyncedRef.current = false;
    }
  }, [session?.user]);

  /** Email-confirm signup: no session until verify — first login has preferred_name in metadata only. */
  useEffect(() => {
    if (loading) return;
    if (signupPreferredNameSyncedRef.current) return;
    if (
      (role !== "victim" && realRoleResolved !== "victim") ||
      !session?.access_token ||
      !session.user
    )
      return;

    if (personalInfo?.preferred_name?.trim()) {
      signupPreferredNameSyncedRef.current = true;
      return;
    }

    const metaName = session.user.user_metadata?.preferred_name;
    const fromMeta =
      typeof metaName === "string" && metaName.trim() ? metaName.trim() : "";
    if (!fromMeta) {
      signupPreferredNameSyncedRef.current = true;
      return;
    }

    signupPreferredNameSyncedRef.current = true;
    void fetch("/api/me/personal-info", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ preferred_name: fromMeta }),
    })
      .then((res) => {
        if (res.ok) void refetchMe();
      })
      .catch(() => {});
  }, [loading, role, realRoleResolved, session, personalInfo?.preferred_name, refetchMe]);

  useEffect(() => {
    // 1) Bootstrap once
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session ?? null);
      resolveProfile(data.session);
      if (data.session?.access_token) {
        try {
          const res = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          if (res.ok) {
            const json = await res.json();
            applyMePayload((json?.data ?? json) as Record<string, unknown>);
          } else {
            clearMeFromApi();
          }
        } catch {
          clearMeFromApi();
        }
      }
      setLoading(false);
    });

    // 2) Single auth listener (SOURCE OF TRUTH)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Suppress "TOKEN_REFRESHED" errors that show as "Failed to fetch"
      if (event === "TOKEN_REFRESHED" && !newSession) {
        return;
      }
      setSession(newSession);
      resolveProfile(newSession);
      if (newSession?.access_token) {
        try {
          const res = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${newSession.access_token}` },
          });
          if (res.ok) {
            const json = await res.json();
            applyMePayload((json?.data ?? json) as Record<string, unknown>);
          } else {
            clearMeFromApi();
          }
        } catch {
          clearMeFromApi();
        }
      } else {
        setRoleFromApi(null);
        setRealRoleFromApi(null);
        setOrgId(null);
        setOrgRole(null);
        setAffiliatedCatalogEntryId(null);
        setOrganizationCatalogEntryId(null);
        setPersonalInfo(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [applyMePayload, clearMeFromApi]);

  const resolveProfile = async (sess: Session | null) => {
    const uid = sess?.user?.id ?? null;

    if (uid !== resolvedUserIdForMeRef.current) {
      resolvedUserIdForMeRef.current = uid;
      setRoleFromApi(null);
      setRealRoleFromApi(null);
      setPersonalInfo(null);
      setAffiliatedCatalogEntryId(null);
      setOrganizationCatalogEntryId(null);
      setOrgId(null);
      setOrgRole(null);
    }

    setEmailVerified(!!sess?.user?.email_confirmed_at);

    const metaRole = sess?.user?.user_metadata?.role;
    if (metaRole === "advocate") setRoleFromMetadata("advocate");
    else if (metaRole === "organization") setRoleFromMetadata("organization");
    else setRoleFromMetadata("victim");

    if (!uid) {
      setIsAdmin(false);
      setAffiliatedCatalogEntryId(null);
      setOrganizationCatalogEntryId(null);
      setAccountStatus("active");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin, account_status")
        .eq("id", uid)
        .single();
      
      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            `[AuthProvider] Profile lookup failed for ${sess?.user?.email} (${uid}):`,
            error.message,
            error.code,
            "\nThis might be an RLS policy issue. Check Supabase policies."
          );
        } else {
          console.warn("[AuthProvider] Profile lookup error:", error.message, "for user:", uid);
        }
        setIsAdmin(false);
        setAccountStatus("active");
        return;
      }

      const rawStatus = data?.account_status;
      setAccountStatus(
        rawStatus === "disabled" || rawStatus === "deleted" ? rawStatus : "active"
      );
      
      const adminStatus = data?.is_admin === true;
      setIsAdmin(adminStatus);
      
      // Debug logging
      if (process.env.NODE_ENV === "development") {
        if (adminStatus) {
          console.log(`[AuthProvider] ✅ Admin access granted for ${sess?.user?.email} (${uid})`);
        } else if (sess?.user?.email) {
          console.warn(
            `[AuthProvider] ⚠️ User ${sess.user.email} (${uid}) is NOT admin. ` +
            `Profile data:`, data,
            `\nCheck in Supabase: SELECT * FROM profiles WHERE id = '${uid}';`
          );
        }
      }
      
    } catch (err) {
      console.error("[AuthProvider] Unexpected error checking admin status:", err);
      setIsAdmin(false);
      setAccountStatus("active");
    }
  };

  const value = useMemo<AuthState>(() => {
    return {
      loading,
      session,
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      role,
      realRole: realRoleResolved,
      isAdmin,
      orgId,
      orgRole,
      affiliatedCatalogEntryId,
      organizationCatalogEntryId,
      emailVerified,
      accountStatus,
      personalInfo,
      advocatePersonalInfo,
      organizationName,
      refetchMe,
    };
  }, [
    loading,
    session,
    role,
    realRoleFromApi,
    roleFromApi,
    roleFromMetadata,
    realRoleResolved,
    isAdmin,
    orgId,
    orgRole,
    affiliatedCatalogEntryId,
    organizationCatalogEntryId,
    emailVerified,
    accountStatus,
    personalInfo,
    advocatePersonalInfo,
    organizationName,
    refetchMe,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}