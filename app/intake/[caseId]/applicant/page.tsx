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

export default function ApplicantPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const t = (k: string) => k;

  const [loading, setLoading] = useState(true);

  const form = useForm<ApplicantSection>({
    resolver: zodResolver(applicantSchema),
    defaultValues: { isVictimAlsoApplicant: "yes" },
    mode: "onBlur",
  });

  useEffect(() => {
    (async () => {
      const data = await fetchCase(caseId);
      form.reset(data.applicant);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const prevHref = useMemo(() => INTAKE_STEPS.find((s) => s.key === "victim")!.path(caseId), [caseId]);
  const nextHref = useMemo(() => INTAKE_STEPS.find((s) => s.key === "crime")!.path(caseId), [caseId]);

  async function onSubmit(values: ApplicantSection) {
    await patchCase(caseId, { applicant: values, lastSavedAt: new Date().toISOString() });
    router.push(nextHref);
  }

  if (loading) return <div className="p-6">{t("common.loading")}</div>;

  const isSame = form.watch("isVictimAlsoApplicant");

  return (
    <IntakeShell
      title={"Applicant information" /* add i18n key later */}
      description={"This is the person applying for compensation." /* add i18n key later */}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <RadioGroupField
          control={form.control}
          name="isVictimAlsoApplicant"
          label={"Is the victim also the applicant?" /* add i18n */}
          options={[
            { value: "yes", label: t("ui.status.yes") },
            { value: "no", label: t("ui.status.no") },
          ]}
        />

        {isSame === "no" ? (
          <>
            <TextField control={form.control} name="relationshipToVictim" label={t("forms.labels.relationship")} placeholder={t("forms.placeholders.typeHere")} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="firstName" label={t("forms.labels.firstName")} />
              <TextField control={form.control} name="lastName" label={t("forms.labels.lastName")} />
              <TextField control={form.control} name="middleName" label={t("forms.labels.middleName")} />
              <DateField control={form.control} name="dateOfBirth" label={t("forms.labels.dateOfBirth")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="phone" label={t("forms.labels.phone")} />
              <TextField control={form.control} name="email" label={t("forms.labels.email")} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <TextField control={form.control} name="address1" label={t("forms.labels.address")} />
              <TextField control={form.control} name="address2" label={t("forms.labels.unit")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField control={form.control} name="city" label={t("forms.labels.city")} />
              <TextField control={form.control} name="state" label={t("forms.labels.state")} />
              <TextField control={form.control} name="zip" label={t("forms.labels.zip")} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border bg-neutral-50 p-4 text-sm text-neutral-700">
            {"We’ll use the victim’s information as the applicant details for now." /* add i18n */}
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