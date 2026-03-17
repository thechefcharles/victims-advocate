"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

function AcceptContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token.trim()) {
      setStatus("error");
      setMessage("Missing invite token");
      return;
    }

    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setStatus("error");
        setMessage("Please log in to accept this invite.");
        return;
      }

      setStatus("loading");
      try {
        const res = await fetch("/api/org/invites/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token: token.trim() }),
        });

        const json = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(getApiErrorMessage(json, "Failed to accept invite"));
          return;
        }

        setStatus("success");
        setMessage(`You’ve joined the organization as ${json.data?.orgRole ?? "member"}.`);
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Failed to accept invite");
      }
    };

    run();
  }, [token]);

  if (status === "idle" || status === "loading") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-400">
            {status === "loading" ? "Accepting invite…" : "Loading…"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center space-y-4">
        {status === "success" ? (
          <>
            <p className="text-emerald-300 font-medium">{message}</p>
            <Link
              href="/advocate"
              className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Go to dashboard
            </Link>
          </>
        ) : (
          <>
            <p className="text-red-300">{message}</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login"
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Log in
              </Link>
              <Link
                href="/"
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Home
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
          <p className="text-slate-400">Loading…</p>
        </main>
      }
    >
      <AcceptContent />
    </Suspense>
  );
}
