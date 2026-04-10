"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EDUCATION_LEVELS,
  type VictimPersonalInfo,
} from "@/lib/personalInfo";
import { useI18n } from "@/components/i18n/i18nProvider";

function triBoolToString(v: boolean | null | undefined): "" | "yes" | "no" {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "";
}

export function ApplicantPersonalInfoForm({
  accessToken,
  initial,
  onSaved,
}: {
  accessToken: string | null;
  initial: VictimPersonalInfo | null;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const a = (key: string) => t(`accountPersonal.${key}`);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [preferred_name, setPreferredName] = useState("");
  const [legal_first_name, setLegalFirstName] = useState("");
  const [legal_last_name, setLegalLastName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [gender_identity, setGenderIdentity] = useState("");
  const [date_of_birth, setDateOfBirth] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [race, setRace] = useState("");
  const [street_address, setStreetAddress] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [cell_phone, setCellPhone] = useState("");
  const [alternate_phone, setAlternatePhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education_level, setEducationLevel] = useState("");
  const [primary_language, setPrimaryLanguage] = useState("");
  const [interpreter, setInterpreter] = useState<"" | "yes" | "no">("");
  const [preferred_contact_method, setPreferredContactMethod] = useState("");
  const [safe_voicemail, setSafeVoicemail] = useState<"" | "yes" | "no">("");
  const [disability_or_access_needs, setDisabilityOrAccessNeeds] = useState("");

  const hydrate = useCallback(
    (pi: VictimPersonalInfo | null) => {
      const p = pi ?? {};
      setPreferredName(p.preferred_name ?? "");
      setLegalFirstName(p.legal_first_name ?? "");
      setLegalLastName(p.legal_last_name ?? "");
      setPronouns(p.pronouns ?? "");
      setGenderIdentity(p.gender_identity ?? "");
      setDateOfBirth(p.date_of_birth ?? "");
      setEthnicity(p.ethnicity ?? "");
      setRace(p.race ?? "");
      setStreetAddress(p.street_address ?? "");
      setApt(p.apt ?? "");
      setCity(p.city ?? "");
      setState(p.state ?? "");
      setZip(p.zip ?? "");
      setCellPhone(p.cell_phone ?? "");
      setAlternatePhone(p.alternate_phone ?? "");
      setOccupation(p.occupation ?? "");
      setEducationLevel(p.education_level ?? "");
      setPrimaryLanguage(p.primary_language ?? "");
      setInterpreter(triBoolToString(p.interpreter_needed));
      setPreferredContactMethod(p.preferred_contact_method ?? "");
      setSafeVoicemail(triBoolToString(p.safe_to_leave_voicemail));
      setDisabilityOrAccessNeeds(p.disability_or_access_needs ?? "");
    },
    []
  );

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
      pronouns: pronouns || null,
      gender_identity: gender_identity || null,
      date_of_birth: date_of_birth || null,
      ethnicity: ethnicity || null,
      race: race || null,
      street_address: street_address || null,
      apt: apt || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      cell_phone: cell_phone || null,
      alternate_phone: alternate_phone || null,
      occupation: occupation || null,
      education_level: education_level || null,
      primary_language: primary_language || null,
      interpreter_needed:
        interpreter === "" ? null : interpreter === "yes",
      preferred_contact_method: preferred_contact_method || null,
      safe_to_leave_voicemail:
        safe_voicemail === "" ? null : safe_voicemail === "yes",
      disability_or_access_needs: disability_or_access_needs || null,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/me/personal-info", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          (json as { message?: string }).message ?? a("saveError")
        );
        return;
      }
      setMsg(a("saved"));
      const data = (json?.data ?? json) as { personalInfo?: VictimPersonalInfo };
      if (data.personalInfo) hydrate(data.personalInfo);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const field =
    "block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/90 px-3 py-2 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

  const label = "block text-xs font-medium text-[var(--color-muted)] mb-1";

  const section = (titleKey: string, children: React.ReactNode) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-charcoal)] border-b border-[var(--color-border)] pb-2">
        {a(titleKey)}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/75 p-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-navy)]">{a("title")}</h2>
        <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">{a("intro")}</p>
        <p className="text-xs text-[var(--color-slate)] mt-1">{a("privacyNote")}</p>
      </div>

      {section("identitySection", (
        <>
          <div>
            <label className={label} htmlFor="pi-preferred">{a("preferredName")}</label>
            <input
              id="pi-preferred"
              className={field}
              value={preferred_name}
              onChange={(e) => setPreferredName(e.target.value)}
              autoComplete="nickname"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="pi-first">{a("legalFirstName")}</label>
              <input
                id="pi-first"
                className={field}
                value={legal_first_name}
                onChange={(e) => setLegalFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className={label} htmlFor="pi-last">{a("legalLastName")}</label>
              <input
                id="pi-last"
                className={field}
                value={legal_last_name}
                onChange={(e) => setLegalLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="pi-pronouns">{a("pronouns")}</label>
              <input
                id="pi-pronouns"
                className={field}
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="pi-gender">{a("genderIdentity")}</label>
              <input
                id="pi-gender"
                className={field}
                value={gender_identity}
                onChange={(e) => setGenderIdentity(e.target.value)}
              />
            </div>
          </div>
        </>
      ))}

      {section("demographicsSection", (
        <>
          <div>
            <label className={label} htmlFor="pi-dob">{a("dateOfBirth")}</label>
            <input
              id="pi-dob"
              type="date"
              className={field}
              value={date_of_birth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="pi-eth">{a("ethnicity")}</label>
              <input
                id="pi-eth"
                className={field}
                value={ethnicity}
                onChange={(e) => setEthnicity(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="pi-race">{a("race")}</label>
              <input
                id="pi-race"
                className={field}
                value={race}
                onChange={(e) => setRace(e.target.value)}
              />
            </div>
          </div>
        </>
      ))}

      {section("addressSection", (
        <>
          <div>
            <label className={label} htmlFor="pi-street">{a("streetAddress")}</label>
            <input
              id="pi-street"
              className={field}
              value={street_address}
              onChange={(e) => setStreetAddress(e.target.value)}
              autoComplete="street-address"
            />
          </div>
          <div>
            <label className={label} htmlFor="pi-apt">{a("apt")}</label>
            <input
              id="pi-apt"
              className={field}
              value={apt}
              onChange={(e) => setApt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className={label} htmlFor="pi-city">{a("city")}</label>
              <input
                id="pi-city"
                className={field}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="address-level2"
              />
            </div>
            <div>
              <label className={label} htmlFor="pi-state">{a("state")}</label>
              <input
                id="pi-state"
                className={field}
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                autoComplete="address-level1"
              />
            </div>
            <div>
              <label className={label} htmlFor="pi-zip">{a("zip")}</label>
              <input
                id="pi-zip"
                className={field}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                autoComplete="postal-code"
              />
            </div>
          </div>
        </>
      ))}

      {section("contactSection", (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="pi-cell">{a("cellPhone")}</label>
              <input
                id="pi-cell"
                type="tel"
                className={field}
                value={cell_phone}
                onChange={(e) => setCellPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div>
              <label className={label} htmlFor="pi-alt">{a("alternatePhone")}</label>
              <input
                id="pi-alt"
                type="tel"
                className={field}
                value={alternate_phone}
                onChange={(e) => setAlternatePhone(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="pi-contact-method">{a("preferredContactMethod")}</label>
            <select
              id="pi-contact-method"
              className={field}
              value={preferred_contact_method}
              onChange={(e) => setPreferredContactMethod(e.target.value)}
            >
              <option value="">{a("contactAny")}</option>
              <option value="email">{a("contactEmail")}</option>
              <option value="phone">{a("contactPhone")}</option>
              <option value="sms">{a("contactSms")}</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pi-vm">{a("safeToLeaveVoicemail")}</label>
            <select
              id="pi-vm"
              className={field}
              value={safe_voicemail}
              onChange={(e) =>
                setSafeVoicemail(e.target.value as "" | "yes" | "no")
              }
            >
              <option value="">{a("interpreterUnspecified")}</option>
              <option value="yes">{a("interpreterYes")}</option>
              <option value="no">{a("interpreterNo")}</option>
            </select>
          </div>
        </>
      ))}

      {section("otherSection", (
        <>
          <div>
            <label className={label} htmlFor="pi-job">{a("occupation")}</label>
            <input
              id="pi-job"
              className={field}
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="pi-edu">{a("educationLevel")}</label>
            <select
              id="pi-edu"
              className={field}
              value={education_level}
              onChange={(e) => setEducationLevel(e.target.value)}
            >
              <option value="">{a("eduSelect")}</option>
              {EDUCATION_LEVELS.filter((x) => x !== "").map((k) => (
                <option key={k} value={k}>
                  {k === "less_than_hs"
                    ? a("eduLessThanHs")
                    : k === "hs_ged"
                      ? a("eduHsGed")
                      : k === "some_college"
                        ? a("eduSomeCollege")
                        : k === "associates"
                          ? a("eduAssociates")
                          : k === "bachelors"
                            ? a("eduBachelors")
                            : k === "graduate"
                              ? a("eduGraduate")
                              : k === "prefer_not"
                                ? a("eduPreferNot")
                                : k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pi-lang">{a("primaryLanguage")}</label>
            <input
              id="pi-lang"
              className={field}
              value={primary_language}
              onChange={(e) => setPrimaryLanguage(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="pi-int">{a("interpreterNeeded")}</label>
            <select
              id="pi-int"
              className={field}
              value={interpreter}
              onChange={(e) =>
                setInterpreter(e.target.value as "" | "yes" | "no")
              }
            >
              <option value="">{a("interpreterUnspecified")}</option>
              <option value="yes">{a("interpreterYes")}</option>
              <option value="no">{a("interpreterNo")}</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pi-access">{a("disabilityOrAccessNeeds")}</label>
            <textarea
              id="pi-access"
              rows={3}
              className={field}
              value={disability_or_access_needs}
              onChange={(e) => setDisabilityOrAccessNeeds(e.target.value)}
            />
          </div>
        </>
      ))}

      <button
        type="button"
        disabled={saving || !accessToken}
        onClick={save}
        className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
      >
        {saving ? a("saving") : a("save")}
      </button>
      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-red-300">{err}</p>}
    </div>
  );
}
