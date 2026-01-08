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
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<ProfileRole>("victim");

  useEffect(() => {
    // 1) Bootstrap once
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      resolveRole(data.session);
      setLoading(false);
    });

    // 2) Single auth listener (SOURCE OF TRUTH)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      resolveRole(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resolveRole = async (sess: Session | null) => {
    const metaRole = sess?.user?.user_metadata?.role;
    setRole(metaRole === "advocate" ? "advocate" : "victim");
  };

  const value = useMemo<AuthState>(() => {
    return {
      loading,
      session,
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      role,
    };
  }, [loading, session, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}