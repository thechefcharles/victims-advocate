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

export default function CrimePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const t = (k: string) => k;

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
    <IntakeShell title={"Crime & incident" /* i18n later */} description={"Basic incident details help eligibility and documentation checks." /* i18n */}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateField control={form.control} name="incidentDate" label={"Incident date" /* i18n */} />
          <TextField control={form.control} name="incidentTime" label={"Incident time (optional)" /* i18n */} placeholder="e.g. 9:30 PM" />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <TextField control={form.control} name="locationAddress" label={"Where did it happen? (street or nearest cross streets)" /* i18n */} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField control={form.control} name="locationCity" label={"City" /* i18n */} />
          <TextField control={form.control} name="locationState" label={"State" /* i18n */} />
          <TextField control={form.control} name="locationZip" label={"ZIP" /* i18n */} />
        </div>

        <RadioGroupField
          control={form.control}
          name="policeReported"
          label={"Was it reported to police?" /* i18n */}
          options={[
            { value: "yes", label: t("ui.status.yes") },
            { value: "no", label: t("ui.status.no") },
            { value: "unknown", label: t("ui.status.unknown") },
          ]}
        />

        {policeReported === "yes" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="policeDepartment" label={"Which police department?" /* i18n */} />
            <TextField control={form.control} name="policeReportNumber" label={"Report / case number (if known)" /* i18n */} />
          </div>
        ) : null}

        <RadioGroupField
          control={form.control}
          name="offenderKnown"
          label={"Is the offender known to you?" /* i18n */}
          options={[
            { value: "yes", label: t("ui.status.yes") },
            { value: "no", label: t("ui.status.no") },
            { value: "unknown", label: t("ui.status.unknown") },
          ]}
        />

        {offenderKnown === "yes" ? (
          <TextField control={form.control} name="offenderName" label={"Offender name (if known)" /* i18n */} />
        ) : null}

        <TextField control={form.control} name="narrative" label={"In a few words, what happened? (optional)" /* i18n */} placeholder={"Keep it brief. You can add more later." /* i18n */} />

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