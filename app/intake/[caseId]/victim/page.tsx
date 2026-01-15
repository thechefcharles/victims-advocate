"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { TextField } from "@/components/forms/TextField";
import { DateField } from "@/components/forms/DateField";
import { RadioGroupField } from "@/components/forms/RadioGroupField";
import { CheckboxField } from "@/components/forms/CheckboxField";

import { fetchCase, patchCase } from "@/lib/api/cases";
import { victimSchema } from "@/lib/intake/schemas";
import type { VictimSection } from "@/lib/intake/types";
import { INTAKE_STEPS } from "@/lib/intake/steps";
// import { useT } from "@/lib/i18n/useT";

export default function VictimPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  // const t = useT();
  const t = (k: string) => k;

  const [loading, setLoading] = useState(true);

  const form = useForm<VictimSection>({
    resolver: zodResolver(victimSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      address1: "",
      city: "",
      state: "IL",
      zip: "",
      hasDisability: "unknown",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCase(caseId);
        form.reset(data.victim);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const nextHref = useMemo(() => INTAKE_STEPS.find((s) => s.key === "applicant")!.path(caseId), [caseId]);

  async function onSubmit(values: VictimSection) {
    await patchCase(caseId, { victim: values, lastSavedAt: new Date().toISOString() });
    router.push(nextHref);
  }

  if (loading) return <div className="p-6">{t("common.loading")}</div>;

  const hasDisability = form.watch("hasDisability");

  return (
    <IntakeShell
      title={t("forms.victim.title")}
      description={t("forms.victim.description")}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="firstName" label={t("fields.firstName.required")} />
          <TextField control={form.control} name="lastName" label={t("fields.lastName.required")} />
          <TextField control={form.control} name="middleName" label={t("forms.labels.middleName")} />
          <DateField control={form.control} name="dateOfBirth" label={t("fields.dateOfBirth.required")} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="phone" label={t("forms.labels.phone")} placeholder={t("fields.cellPhone.placeholder")} />
          <TextField control={form.control} name="email" label={t("fields.email.label")} placeholder={t("forms.placeholders.typeHere")} />
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

        <div className="rounded-lg border bg-neutral-50 p-4">
          <div className="text-sm font-semibold">{t("forms.victim.civilRightsNote")}</div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField control={form.control} name="genderIdentity" label={t("fields.genderIdentity.optional")} placeholder={t("fields.genderIdentity.placeholder")} />
            <TextField control={form.control} name="race" label={t("fields.race.optional")} placeholder={t("fields.race.placeholder")} />
            <TextField control={form.control} name="ethnicity" label={t("fields.ethnicity.optional")} placeholder={t("fields.ethnicity.placeholder")} />
          </div>
        </div>

        <RadioGroupField
          control={form.control}
          name="hasDisability"
          label={t("fields.hasDisability.question")}
          options={[
            { value: "yes", label: t("ui.status.yes") },
            { value: "no", label: t("ui.status.no") },
            { value: "unknown", label: t("ui.status.unknown") },
          ]}
        />

        {hasDisability === "yes" ? (
          <div className="space-y-2 rounded-lg border p-4">
            <div className="text-sm font-medium">{t("common.loading") /* replace with a disability types label key if you add one */}</div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <CheckboxField control={form.control} name="disabilityTypes.physical" label={t("fields.disabilityType.physical")} />
              <CheckboxField control={form.control} name="disabilityTypes.mental" label={t("fields.disabilityType.mental")} />
              <CheckboxField control={form.control} name="disabilityTypes.developmental" label={t("fields.disabilityType.developmental")} />
              <CheckboxField control={form.control} name="disabilityTypes.other" label={t("fields.disabilityType.other")} />
            </div>

            {form.watch("disabilityTypes.other") ? (
              <TextField control={form.control} name="disabilityTypes.otherText" label={t("forms.labels.notes")} />
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => router.push(`/dashboard`)}
          >
            {t("common.backToHome")}
          </button>

          <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm text-white">
            {t("ui.buttons.next")}
          </button>
        </div>
      </form>
    </IntakeShell>
  );
}