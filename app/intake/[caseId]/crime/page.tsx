// app/intake/[caseId]/crime/page.tsx
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
import { crimeSchema } from "@/lib/intake/schemas";
import type { CrimeSection } from "@/lib/intake/types";
import { INTAKE_STEPS } from "@/lib/intake/steps";
import { useI18n } from "@/components/i18n/i18nProvider"; // NEW

export default function CrimePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const { t } = useI18n(); // NEW

  const [loading, setLoading] = useState(true);

  const form = useForm<CrimeSection>({
    resolver: zodResolver(crimeSchema),
    defaultValues: { policeReported: "unknown", offenderKnown: "unknown" },
    mode: "onBlur",
  });

  useEffect(() => {
    (async () => {
      const data = await fetchCase(caseId);
      form.reset(data.crime);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const prevHref = useMemo(() => INTAKE_STEPS.find((s) => s.key === "applicant")!.path(caseId), [caseId]);
  const nextHref = useMemo(() => INTAKE_STEPS.find((s) => s.key === "losses")!.path(caseId), [caseId]);

  async function onSubmit(values: CrimeSection) {
    await patchCase(caseId, { crime: values, lastSavedAt: new Date().toISOString() });
    router.push(nextHref);
  }

  if (loading) return <div className="p-6">{t("common.loading")}</div>;

  const policeReported = form.watch("policeReported");
  const offenderKnown = form.watch("offenderKnown");

  return (
    <IntakeShell title={t("forms.crime.title")} description={t("forms.crime.description")}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateField control={form.control} name="incidentDate" label={t("forms.crime.incidentDateLabel")} />
          <TextField
            control={form.control}
            name="incidentTime"
            label={t("forms.crime.incidentTimeLabel")}
            placeholder={t("forms.crime.incidentTimePlaceholder")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <TextField control={form.control} name="locationAddress" label={t("forms.crime.locationAddressLabel")} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField control={form.control} name="locationCity" label={t("fields.city.required")} />
          <TextField control={form.control} name="locationState" label={t("fields.state.required")} />
          <TextField control={form.control} name="locationZip" label={t("fields.zip.required")} />
        </div>

        <RadioGroupField
          control={form.control}
          name="policeReported"
          label={t("forms.crime.policeReportedLabel")}
          options={[
            { value: "yes", label: t("ui.status.yes") },
            { value: "no", label: t("ui.status.no") },
            { value: "unknown", label: t("ui.status.unknown") },
          ]}
        />

        {policeReported === "yes" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="policeDepartment" label={t("forms.crime.policeDepartmentLabel")} />
            <TextField control={form.control} name="policeReportNumber" label={t("forms.crime.policeReportNumberLabel")} />
          </div>
        ) : null}

        <RadioGroupField
          control={form.control}
          name="offenderKnown"
          label={t("forms.crime.offenderKnownLabel")}
          options={[
            { value: "yes", label: t("ui.status.yes") },
            { value: "no", label: t("ui.status.no") },
            { value: "unknown", label: t("ui.status.unknown") },
          ]}
        />

        {offenderKnown === "yes" ? (
          <TextField control={form.control} name="offenderName" label={t("forms.crime.offenderNameLabel")} />
        ) : null}

        <TextField
          control={form.control}
          name="narrative"
          label={t("forms.crime.narrativeLabel")}
          placeholder={t("forms.crime.narrativePlaceholder")}
        />

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