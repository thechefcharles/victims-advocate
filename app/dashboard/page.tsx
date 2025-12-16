// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import VictimDashboard from "@/components/dashboard/VictimDashboard";
import AdvocateDashboard from "@/components/dashboard/AdvocateDashboard";

type UserRole = "victim" | "advocate";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("victim");
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        const session = data.session;

        if (error) console.warn("[Dashboard] getSession error:", error);

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const uid = session.user.id;
        const em = session.user.email ?? null;

        // ✅ role from profiles (if RLS blocks this, default to victim)
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();

        if (profErr) {
          console.warn("[Dashboard] profiles role lookup error:", profErr);
        }

        const userRole: UserRole =
          prof?.role === "advocate" ? "advocate" : "victim";

        if (!mounted) return;

        setUserId(uid);
        setEmail(em);
        setRole(userRole);
      } catch (e) {
        console.error("[Dashboard] bootstrap failed:", e);
        // if something fails badly, kick to login
        router.replace("/login");
        return;
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto">Loading…</div>
      </main>
    );
  }

  return role === "advocate" ? (
    <AdvocateDashboard email={email} userId={userId} />
  ) : (
    <VictimDashboard email={email} userId={userId} />
  );
}