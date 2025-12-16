// components/auth/AuthProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type ProfileRole = "victim" | "advocate";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  accessToken: string | null;
  role: ProfileRole; // default victim
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<ProfileRole>("victim");

  const inFlightRef = useRef(false);

  const resolveRole = async (sess: Session | null) => {
    // ✅ fast + reliable source: auth user_metadata.role
    const metaRole = (sess?.user?.user_metadata?.role as ProfileRole) ?? "victim";
    const resolved: ProfileRole = metaRole === "advocate" ? "advocate" : "victim";
    setRole(resolved);

    // ✅ optional: best-effort confirm from profiles (don’t block UI)
    const uid = sess?.user?.id;
    if (!uid) return;

    try {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      if (!error && prof?.role) {
        setRole(prof.role === "advocate" ? "advocate" : "victim");
      }
    } catch {
      // ignore (RLS / network / dev timing)
    }
  };

  const refresh = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setSession(null);
        setRole("victim");
        return;
      }
      setSession(data.session ?? null);
      await resolveRole(data.session ?? null);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1) Subscribe FIRST (so we catch INITIAL_SESSION reliably)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setLoading(false);
      await resolveRole(newSession);
    });

    // 2) Bootstrap (covers dev cases where INITIAL_SESSION timing is weird)
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
        await resolveRole(data.session ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    const accessToken = session?.access_token ?? null;

    return {
      loading,
      session,
      user,
      accessToken,
      role,
      refresh,
    };
  }, [loading, session, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}