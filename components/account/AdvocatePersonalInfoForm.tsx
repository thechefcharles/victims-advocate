"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdvocatePersonalInfo } from "@/lib/personalInfo";
import { useI18n } from "@/components/i18n/i18nProvider";

function triBoolToString(v: boolean | null | undefined): "" | "yes" | "no" {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "";
}

export function AdvocatePersonalInfoForm({
  accessToken,
  initial,
  organizationName,
  onSaved,
}: {
  accessToken: string | null;
  initial: AdvocatePersonalInfo | null;
  /** From org membership — read-only. */
  organizationName: string | null;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const a = (key: string) => t(`accountAdvocate.${key}`);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [preferred_name, setPreferredName] = useState("");
  const [legal_first_name, setLegalFirstName] = useState("");
  const [legal_last_name, setLegalLastName] = useState("");
  const [job_title, setJobTitle] = useState("");
  const [work_phone, setWorkPhone] = useState("");
  const [work_phone_ext, setWorkPhoneExt] = useState("");
  const [alternate_phone, setAlternatePhone] = useState("");
  const [work_city, setWorkCity] = useState("");
  const [work_state, setWorkState] = useState("");
  const [work_zip, setWorkZip] = useState("");
  const [languages, setLanguages] = useState("");
  const [preferred_contact_method, setPreferredContactMethod] = useState("");
  const [safe_voicemail, setSafeVoicemail] = useState<"" | "yes" | "no">("");

  const hydrate = useCallback((pi: AdvocatePersonalInfo | null) => {
    const p = pi ?? {};
    setPreferredName(p.preferred_name ?? "");
    setLegalFirstName(p.legal_first_name ?? "");
    setLegalLastName(p.legal_last_name ?? "");
    setJobTitle(p.job_title ?? "");
    setWorkPhone(p.work_phone ?? "");
    setWorkPhoneExt(p.work_phone_ext ?? "");
    setAlternatePhone(p.alternate_phone ?? "");
    setWorkCity(p.work_city ?? "");
    setWorkState(p.work_state ?? "");
    setWorkZip(p.work_zip ?? "");
    setLanguages(p.languages ?? "");
    setPreferredContactMethod(p.preferred_contact_method ?? "");
    setSafeVoicemail(triBoolToString(p.safe_to_leave_voicemail));
  }, []);

  useEffect(() => {
    hydrate(initial);
  }, [initial, hydrate]);

  const save = async () => {
    setMsg(null);
    setErr(null);
    if (!accessToken) {
      setErr(a("notSignedIn"));
      return;
    }

    const body: Record<string, unknown> = {
      preferred_name: preferred_name || null,
      legal_first_name: legal_first_name || null,
      legal_last_name: legal_last_name || null,
      job_title: job_title || null,
      work_phone: work_phone || null,
      work_phone_ext: work_phone_ext || null,
      alternate_phone: alternate_phone || null,
      work_city: work_city || null,
      work_state: work_state || null,
      work_zip: work_zip || null,
      languages: languages || null,
      preferred_contact_method: preferred_contact_method || null,
      safe_to_leave_voicemail:
        safe_voicemail === "" ? null : safe_voicemail === "yes",
    };

    setSaving(true);
    try {
      const res = await fetch("/api/me/advocate-personal-info", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((json as { message?: string }).message ?? a("saveError"));
        return;
      }
      setMsg(a("saved"));
      const data = (json?.data ?? json) as { advocatePersonalInfo?: AdvocatePersonalInfo };
      if (data.advocatePersonalInfo) hydrate(data.advocatePersonalInfo);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const field =
    "block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/90 px-3 py-2 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

  const label = "block text-xs font-medium text-[var(--color-muted)] mb-1";

  return (
    <div className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/75 p-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-navy)]">{a("title")}</h2>
        <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">{a("intro")}</p>
        <p className="text-xs text-[var(--color-slate)] mt-1">{a("privacyNote")}</p>
      </div>

      <div id="advocate-organization" className="space-y-3 scroll-mt-24">
        <h3 className="text-sm font-semibold text-[var(--color-charcoal)] border-b border-[var(--color-border)] pb-2">
          {a("organizationSection")}
        </h3>
        <p className="text-xs text-[var(--color-muted)]">{a("organizationHelp")}</p>
        <div>
          <label className={label} htmlFor="adv-org-name">
            {a("organizationName")}
          </label>
          <input
            id="adv-org-name"
            className={`${field} opacity-80`}
            value={organizationName ?? ""}
            readOnly
            placeholder={a("organizationEmpty")}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-charcoal)] border-b border-[var(--color-border)] pb-2">
          {a("identitySection")}
        </h3>
        <div>
          <label className={label} htmlFor="adv-pref">{a("preferredName")}</label>
          <input
            id="adv-pref"
            className={field}
            value={preferred_name}
            onChange={(e) => setPreferredName(e.target.value)}
            autoComplete="nickname"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="adv-first">{a("legalFirstName")}</label>
            <input
              id="adv-first"
              className={field}
              value={legal_first_name}
              onChange={(e) => setLegalFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className={label} htmlFor="adv-last">{a("legalLastName")}</label>
            <input
              id="adv-last"
              className={field}
              value={legal_last_name}
              onChange={(e) => setLegalLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="adv-job">{a("jobTitle")}</label>
          <input
            id="adv-job"
            className={field}
            value={job_title}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-charcoal)] border-b border-[var(--color-border)] pb-2">
          {a("workLocationSection")}
        </h3>
        <div>
          <label className={label} htmlFor="adv-city">{a("workCity")}</label>
          <input
            id="adv-city"
            className={field}
            value={work_city}
            onChange={(e) => setWorkCity(e.target.value)}
            autoComplete="address-level2"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={label} htmlFor="adv-wstate">{a("workState")}</label>
            <input
              id="adv-wstate"
              className={field}
              maxLength={2}
              value={work_state}
              onChange={(e) => setWorkState(e.target.value.toUpperCase())}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="adv-wzip">{a("workZip")}</label>
            <input
              id="adv-wzip"
              className={field}
              value={work_zip}
              onChange={(e) => setWorkZip(e.target.value)}
              autoComplete="postal-code"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-charcoal)] border-b border-[var(--color-border)] pb-2">
          {a("contactSection")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="adv-wphone">{a("workPhone")}</label>
            <input
              id="adv-wphone"
              type="tel"
              className={field}
              value={work_phone}
              onChange={(e) => setWorkPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div>
            <label className={label} htmlFor="adv-ext">{a("workPhoneExt")}</label>
            <input
              id="adv-ext"
              className={field}
              value={work_phone_ext}
              onChange={(e) => setWorkPhoneExt(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="adv-alt">{a("alternatePhone")}</label>
          <input
            id="adv-alt"
            type="tel"
            className={field}
            value={alternate_phone}
            onChange={(e) => setAlternatePhone(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="adv-pref-contact">{a("preferredContactMethod")}</label>
          <select
            id="adv-pref-contact"
            className={field}
            value={preferred_contact_method}
            onChange={(e) => setPreferredContactMethod(e.target.value)}
          >
            <option value="">{a("contactSelect")}</option>
            <option value="email">{a("contactEmail")}</option>
            <option value="phone">{a("contactPhone")}</option>
            <option value="sms">{a("contactSms")}</option>
          </select>
        </div>
        <div>
          <span className={label}>{a("safeToLeaveVoicemail")}</span>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--color-slate)]">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="adv-vm"
                checked={safe_voicemail === "yes"}
                onChange={() => setSafeVoicemail("yes")}
              />
              {a("interpreterYes")}
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="adv-vm"
                checked={safe_voicemail === "no"}
                onChange={() => setSafeVoicemail("no")}
              />
              {a("interpreterNo")}
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="adv-vm"
                checked={safe_voicemail === ""}
                onChange={() => setSafeVoicemail("")}
              />
              {a("interpreterUnspecified")}
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-charcoal)] border-b border-[var(--color-border)] pb-2">
          {a("languagesSection")}
        </h3>
        <div>
          <label className={label} htmlFor="adv-lang">{a("languages")}</label>
          <input
            id="adv-lang"
            className={field}
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder={a("languagesPlaceholder")}
          />
        </div>
      </div>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
      >
        {saving ? a("saving") : a("save")}
      </button>
    </div>
  );
}
