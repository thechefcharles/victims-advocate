"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AccountDisabledPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-slate-100">Account disabled</h1>
        <p className="text-sm text-slate-400">
          This account has been disabled. If you believe this is an error, please contact support.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Sign out
        </button>
        <p className="text-center">
          <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
