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
          setMessage(
            getApiErrorMessage(
              json,
              "We couldn't accept that invite — it may have expired. Ask your organization to send a new one.",
            ),
          );
          return;
        }

        setStatus("success");
        const label =
          typeof json.data?.orgRoleLabel === "string" && json.data.orgRoleLabel.trim()
            ? json.data.orgRoleLabel.trim()
            : "member";
        setMessage(`You’ve joined the organization as ${label}.`);
      } catch (e) {
        setStatus("error");
        setMessage(
          e instanceof Error
            ? e.message
            : "We couldn't accept that invite — check your connection and try again.",
        );
      }
    };

    run();
  }, [token]);

  if (status === "idle" || status === "loading") {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[var(--color-muted)]">
            {status === "loading" ? "Accepting invite…" : "Loading…"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-6 text-center space-y-4">
        {status === "success" ? (
          <>
            <p className="text-emerald-300 font-medium">{message}</p>
            <a
              href="/dashboard"
              className="inline-block rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-teal)]"
            >
              Continue To Your Workspace
            </a>
          </>
        ) : (
          <>
            <p className="text-red-300">{message}</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login"
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
              >
                Log in
              </Link>
              <Link
                href="/"
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
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
        <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
          <p className="text-[var(--color-muted)]">Loading…</p>
        </main>
      }
    >
      <AcceptContent />
    </Suspense>
  );
}
