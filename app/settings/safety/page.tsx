"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";

export default function SafetySettingsPage() {
  const { accessToken } = useAuth();
  const { settings, loading, setSettings } = useSafetySettings(accessToken);
  const [saving, setSaving] = useState(false);

  const [local, setLocal] = useState({
    safety_mode_enabled: false,
    hide_sensitive_labels: true,
    suppress_notification_previews: true,
    clear_local_state_on_quick_exit: true,
    reduced_dashboard_visibility: true,
  });

  useEffect(() => {
    if (!settings) return;
    setLocal({
      safety_mode_enabled: Boolean(settings.safety_mode_enabled),
      hide_sensitive_labels: Boolean(settings.hide_sensitive_labels),
      suppress_notification_previews: Boolean(settings.suppress_notification_previews),
      clear_local_state_on_quick_exit: Boolean(settings.clear_local_state_on_quick_exit),
      reduced_dashboard_visibility: Boolean(settings.reduced_dashboard_visibility),
    });
  }, [settings]);

  const save = async (patch: Partial<typeof local>) => {
    if (!accessToken) return;
    const next = { ...local, ...patch };
    setLocal(next);
    setSaving(true);
    try {
      const res = await fetch("/api/safety/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(next),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.settings) {
        setSettings(json.settings);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[var(--color-navy)]">Safety Mode</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        These settings reduce what’s visible at a glance and help you exit quickly.
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-5">
        {loading && <p className="text-[11px] text-[var(--color-muted)]">Loading…</p>}

        <ToggleRow
          label="Enable Safety Mode"
          description="Reduce previews and sensitive labels across the app."
          value={local.safety_mode_enabled}
          onChange={(v) => save({ safety_mode_enabled: v })}
          disabled={saving}
        />

        <ToggleRow
          label="Suppress notification previews"
          description="Use extra-generic notification wording."
          value={local.suppress_notification_previews}
          onChange={(v) => save({ suppress_notification_previews: v })}
          disabled={saving}
        />

        <ToggleRow
          label="Hide sensitive labels"
          description="Reduce explicit labels in lists and summaries."
          value={local.hide_sensitive_labels}
          onChange={(v) => save({ hide_sensitive_labels: v })}
          disabled={saving}
        />

        <ToggleRow
          label="Clear local state on Quick Exit"
          description="Removes locally-saved drafts and pointers before leaving."
          value={local.clear_local_state_on_quick_exit}
          onChange={(v) => save({ clear_local_state_on_quick_exit: v })}
          disabled={saving}
        />

        <ToggleRow
          label="Reduced dashboard visibility"
          description="Minimize detail in dashboard list views."
          value={local.reduced_dashboard_visibility}
          onChange={(v) => save({ reduced_dashboard_visibility: v })}
          disabled={saving}
        />

        <div className="pt-2 text-[11px] text-[var(--color-muted)]">
          Changes apply immediately on refresh. Quick Exit is available in the top bar when signed in.
        </div>
      </div>
    </main>
  );
}

function ToggleRow(props: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { label, description, value, onChange, disabled } = props;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--color-navy)]">{label}</div>
        <div className="text-[11px] text-[var(--color-muted)]">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`h-7 w-12 rounded-full border transition ${
          value ? "bg-emerald-500/20 border-emerald-400/40" : "bg-white border-[var(--color-border)]"
        } disabled:opacity-60`}
        aria-pressed={value}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-[var(--color-border-light)] transition translate-y-[1px] ${
            value ? "translate-x-6 bg-[var(--color-sage)]" : "translate-x-1 bg-[var(--color-muted)]"
          }`}
        />
      </button>
    </div>
  );
}

