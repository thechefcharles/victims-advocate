// app/intake/[caseId]/applicant/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { TextField } from "@/components/forms/TextField";
import { DateField } from "@/components/forms/DateField";
import { RadioGroupField } from "@/components/forms/RadioGroupField";

import { fetchCase, patchCase } from "@/lib/api/cases";
import { applicantSchema } from "@/lib/intake/schemas";
import type { ApplicantSection } from "@/lib/intake/types";
import { INTAKE_STEPS } from "@/lib/intake/steps";
import { useI18n } from "@/components/i18n/i18nProvider"; // NEW

export default function ApplicantPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const { t } = useI18n(); // NEW

  const [loading, setLoading] = useState(true);

  const form = useForm<ApplicantSection>({
    resolver: zodResolver(applicantSchema),
    // UPDATED: include all fields that can appear in the UI to keep RHF stable
    defaultValues: {
      isVictimAlsoApplicant: "yes",
      relationshipToVictim: "",
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "",
      phone: "",
      email: "",
      address1: "",
      address2: "",
      city: "",
      state: "IL",
      zip: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCase(caseId);
        if (data?.applicant) form.reset(data.applicant);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const prevHref = useMemo(
    () => INTAKE_STEPS.find((s) => s.key === "victim")!.path(caseId),
    [caseId]
  );
  const nextHref = useMemo(
    () => INTAKE_STEPS.find((s) => s.key === "crime")!.path(caseId),
    [caseId]
  );

  async function onSubmit(values: ApplicantSection) {
    await patchCase(caseId, { applicant: values, lastSavedAt: new Date().toISOString() });
    router.push(nextHref);
  }

  if (loading) return <div className="p-6">{t("common.loading")}</div>;

  const isSame = form.watch("isVictimAlsoApplicant");

  return (
    <IntakeShell title={t("forms.applicant.title")} description={t("forms.applicant.description")}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <RadioGroupField
          control={form.control}
          name="isVictimAlsoApplicant"
          label={t("forms.applicant.isVictimAlsoApplicantLabel")}
          options={[
            { value: "yes", label: t("ui.status.yes") },
            { value: "no", label: t("ui.status.no") },
          ]}
        />

        {isSame === "no" ? (
          <>
            <TextField
              control={form.control}
              name="relationshipToVictim"
              label={t("forms.labels.relationship")}
              placeholder={t("forms.placeholders.typeHere")}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="firstName" label={t("fields.firstName.required")} />
              <TextField control={form.control} name="lastName" label={t("fields.lastName.required")} />
              <TextField control={form.control} name="middleName" label={t("forms.labels.middleName")} />
              <DateField control={form.control} name="dateOfBirth" label={t("fields.dateOfBirth.required")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="phone" label={t("forms.labels.phone")} />
              <TextField control={form.control} name="email" label={t("fields.email.label")} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <TextField control={form.control} name="address1" label={t("fields.streetAddress.required")} />
              <TextField control={form.control} name="address2" label={t("fields.apt.label")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField control={form.control} name="city" label={t("fields.city.required")} />
              <TextField control={form.control} name="state" label={t("fields.state.required")} />
              <TextField control={form.control} name="zip" label={t("fields.zip.required")} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border bg-neutral-50 p-4 text-sm text-neutral-700">
            {t("forms.applicant.sameAsVictimNote")}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => router.push(prevHref)}>
            {t("ui.buttons.back")}
          </button>

          <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm text-white">
            {t("ui.buttons.next")}
          </button>
        </div>
      </form>
    </IntakeShell>
  );
}