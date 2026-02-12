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
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
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
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", uid)
        .single();
      setIsAdmin(data?.is_admin === true);
    } catch {
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