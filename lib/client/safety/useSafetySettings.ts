"use client";

import { useEffect, useMemo, useState } from "react";

export type SafetySettings = {
  user_id: string;
  safety_mode_enabled: boolean;
  hide_sensitive_labels: boolean;
  suppress_notification_previews: boolean;
  clear_local_state_on_quick_exit: boolean;
  reduced_dashboard_visibility: boolean;
  metadata: Record<string, unknown>;
};

export function useSafetySettings(accessToken: string | null | undefined) {
  const [settings, setSettings] = useState<SafetySettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) {
        setSettings(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/safety/settings", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        if (!cancelled) setSettings((json?.settings ?? null) as SafetySettings | null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const safetyEnabled = useMemo(() => Boolean(settings?.safety_mode_enabled), [settings]);
  const strictPreviews = useMemo(
    () => Boolean(settings?.safety_mode_enabled || settings?.suppress_notification_previews),
    [settings]
  );

  return { settings, loading, safetyEnabled, strictPreviews, setSettings };
}

