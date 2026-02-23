// app/debug-admin/page.tsx
// Client-side admin status checker (for Christina to use)

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function DebugAdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      try {
        const { data, error: err } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (err) {
          setError(err.message + " (Code: " + err.code + ")");
          return;
        }

        setProfileData(data);
      } catch (e: any) {
        setError(e.message);
      }
    };

    checkProfile();
  }, [user]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 p-6">
        <div className="max-w-2xl mx-auto">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-xl font-semibold">Admin Debug</h1>
          <p className="text-red-300">Not logged in. Please log in first.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold">Admin Status Debug</h1>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
          <h2 className="text-sm font-semibold">Current User</h2>
          <div className="text-xs space-y-1 font-mono">
            <div>Email: <span className="text-slate-300">{user.email}</span></div>
            <div>User ID: <span className="text-slate-300">{user.id}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
          <h2 className="text-sm font-semibold">AuthProvider Status</h2>
          <div className="text-xs space-y-1">
            <div>
              isAdmin:{" "}
              <span className={isAdmin ? "text-emerald-400 font-semibold" : "text-red-400"}>
                {String(isAdmin)}
              </span>
            </div>
            {!isAdmin && (
              <p className="text-amber-300 text-[11px] mt-2">
                ⚠️ AuthProvider says you're NOT admin. Check profile data below.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
          <h2 className="text-sm font-semibold">Profile Data (from Supabase)</h2>
          {error ? (
            <div className="text-xs text-red-300 space-y-2">
              <p className="font-semibold">Error reading profile:</p>
              <p className="font-mono">{error}</p>
              <p className="text-amber-300 mt-4">
                This is likely an RLS (Row Level Security) issue. The profile exists in Supabase
                but the client can't read it.
              </p>
              <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-700">
                <p className="text-[11px] font-semibold mb-2">Fix in Supabase SQL Editor:</p>
                <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto">
{`-- Ensure this policy exists:
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Or temporarily disable RLS to test:
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;`}
                </pre>
              </div>
            </div>
          ) : profileData ? (
            <div className="text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>ID:</div>
                <div className="font-mono text-slate-300">{profileData.id}</div>
                <div>Role:</div>
                <div className="text-slate-300">{profileData.role || "—"}</div>
                <div>is_admin:</div>
                <div className={profileData.is_admin ? "text-emerald-400 font-semibold" : "text-red-400"}>
                  {String(profileData.is_admin)}
                </div>
                <div>Organization:</div>
                <div className="text-slate-300">{profileData.organization || "—"}</div>
              </div>
              {profileData.is_admin !== true && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                  <p className="text-[11px] text-amber-200">
                    ⚠️ Profile exists but <code>is_admin</code> is not <code>true</code>.
                  </p>
                  <p className="text-[10px] text-amber-300 mt-2">
                    Run in Supabase SQL Editor:
                  </p>
                  <pre className="text-[10px] font-mono text-amber-200 mt-1 overflow-x-auto">
{`UPDATE public.profiles
SET is_admin = true
WHERE id = '${user.id}';`}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400">Loading profile...</div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
          <h2 className="text-sm font-semibold">Quick Fixes</h2>
          <div className="text-xs space-y-2">
            <p>If profile is missing or is_admin is false, run this in Supabase SQL Editor:</p>
            <pre className="p-3 bg-slate-900 rounded border border-slate-700 text-[10px] font-mono text-slate-300 overflow-x-auto">
{`-- Ensure profile exists
INSERT INTO public.profiles (id, role, is_admin)
VALUES ('${user.id}', 'advocate', true)
ON CONFLICT (id) DO UPDATE SET is_admin = true;

-- Verify
SELECT email, is_admin FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email = '${user.email}';`}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
