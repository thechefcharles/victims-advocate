// components/auth/RequireAuth.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function RequireAuth({
  children,
  redirectTo = "/login",
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`${redirectTo}?next=${next}`);
    }
  }, [loading, user, router, redirectTo, pathname]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-400">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}