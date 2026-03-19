"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

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
  emailVerified: boolean;
  accountStatus: AccountStatus;
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
  const [emailVerified, setEmailVerified] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");

  const role = roleFromApi ?? roleFromMetadata;

  const refetchMe = useCallback(async () => {
    const token = session?.access_token ?? null;
    if (!token) return;
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        if (
          data?.role === "victim" ||
          data?.role === "advocate" ||
          data?.role === "organization"
        ) {
          setRoleFromApi(data.role);
        }
        if (
          data?.realRole === "victim" ||
          data?.realRole === "advocate" ||
          data?.realRole === "organization"
        ) {
          setRealRoleFromApi(data.realRole);
        }
        if (typeof data?.emailVerified === "boolean") setEmailVerified(data.emailVerified);
        if (data?.accountStatus) setAccountStatus(data.accountStatus);
        setIsAdmin(data?.isAdmin === true);
        setOrgId(typeof data?.orgId === "string" ? data.orgId : null);
        const or = data?.orgRole;
        setOrgRole(
          or === "staff" || or === "supervisor" || or === "org_admin" ? or : null
        );
      }
    } catch {
      setRoleFromApi(null);
      setRealRoleFromApi(null);
    }
  }, [session?.access_token]);

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
            const d = json?.data ?? json;
            if (d?.role === "victim" || d?.role === "advocate" || d?.role === "organization")
              setRoleFromApi(d.role);
            if (
              d?.realRole === "victim" ||
              d?.realRole === "advocate" ||
              d?.realRole === "organization"
            )
              setRealRoleFromApi(d.realRole);
            if (typeof d?.emailVerified === "boolean") setEmailVerified(d.emailVerified);
            if (d?.accountStatus) setAccountStatus(d.accountStatus);
            setOrgId(typeof d?.orgId === "string" ? d.orgId : null);
            const or = d?.orgRole;
            setOrgRole(
              or === "staff" || or === "supervisor" || or === "org_admin" ? or : null
            );
          }
        } catch {
          // keep role from metadata
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
            const d = json?.data ?? json;
            if (d?.role === "victim" || d?.role === "advocate" || d?.role === "organization")
              setRoleFromApi(d.role);
            if (
              d?.realRole === "victim" ||
              d?.realRole === "advocate" ||
              d?.realRole === "organization"
            )
              setRealRoleFromApi(d.realRole);
            if (typeof d?.emailVerified === "boolean") setEmailVerified(d.emailVerified);
            if (d?.accountStatus) setAccountStatus(d.accountStatus);
            setOrgId(typeof d?.orgId === "string" ? d.orgId : null);
            const or = d?.orgRole;
            setOrgRole(
              or === "staff" || or === "supervisor" || or === "org_admin" ? or : null
            );
          }
        } catch {
          setRoleFromApi(null);
          setRealRoleFromApi(null);
        }
      } else {
        setRoleFromApi(null);
        setRealRoleFromApi(null);
        setOrgId(null);
        setOrgRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resolveProfile = async (sess: Session | null) => {
    setEmailVerified(!!sess?.user?.email_confirmed_at);

    const metaRole = sess?.user?.user_metadata?.role;
    if (metaRole === "advocate") setRoleFromMetadata("advocate");
    else if (metaRole === "organization") setRoleFromMetadata("organization");
    else setRoleFromMetadata("victim");
    setRoleFromApi(null);

    const uid = sess?.user?.id;
    if (!uid) {
      setIsAdmin(false);
      setOrgId(null);
      setOrgRole(null);
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
      realRole: realRoleFromApi ?? roleFromMetadata,
      isAdmin,
      orgId,
      orgRole,
      emailVerified,
      accountStatus,
      refetchMe,
    };
  }, [
    loading,
    session,
    role,
    realRoleFromApi,
    roleFromMetadata,
    isAdmin,
    orgId,
    orgRole,
    emailVerified,
    accountStatus,
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