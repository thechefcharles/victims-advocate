"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setEmail(data.user.email ?? null);
    };
    run();
  }, [router]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Your Dashboard</h1>
      <p className="opacity-80 mt-2">Signed in as: {email ?? "…"}</p>

      <div className="mt-6 flex gap-3">
        <a className="border rounded-md px-4 py-2" href="/compensation/intake">
          Continue Application
        </a>
        <button
          className="border rounded-md px-4 py-2"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}