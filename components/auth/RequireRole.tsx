// components/auth/RequireRole.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type ProfileRole } from "@/components/auth/AuthProvider";

export function RequireRole({
  allow,
  children,
  redirectTo = "/dashboard",
}: {
  allow: ProfileRole | ProfileRole[];
  children: ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { loading, user, role } = useAuth();

  const allowedRoles = Array.isArray(allow) ? allow : [allow];
  const isAllowed = allowedRoles.includes(role);

  useEffect(() => {
    if (loading) return;
    if (!user) return; // RequireAuth handles unauthenticated
    if (!isAllowed) router.replace(redirectTo);
  }, [loading, user, isAllowed, redirectTo, router]);

  if (loading) return null;
  if (!user) return null;
  if (!isAllowed) return null;

  return <>{children}</>;
}