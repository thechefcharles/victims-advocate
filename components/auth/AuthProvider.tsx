"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type ProfileRole = "victim" | "advocate";

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  role: ProfileRole;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<ProfileRole>("victim");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1) Bootstrap once
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      resolveProfile(data.session);
      setLoading(false);
    });

    // 2) Single auth listener (SOURCE OF TRUTH)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Suppress "TOKEN_REFRESHED" errors that show as "Failed to fetch"
      if (event === "TOKEN_REFRESHED" && !newSession) {
        // Token refresh failed but session still valid - ignore
        return;
      }
      setSession(newSession);
      resolveProfile(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resolveProfile = async (sess: Session | null) => {
    const metaRole = sess?.user?.user_metadata?.role;
    setRole(metaRole === "advocate" ? "advocate" : "victim");

    const uid = sess?.user?.id;
    if (!uid) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
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
        return;
      }
      
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
    }
  };

  const value = useMemo<AuthState>(() => {
    return {
      loading,
      session,
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      role,
      isAdmin,
    };
  }, [loading, session, role, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}