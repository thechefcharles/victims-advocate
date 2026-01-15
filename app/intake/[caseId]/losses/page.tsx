"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { CheckboxField } from "@/components/forms/CheckboxField";
import { TextField } from "@/components/forms/TextField";

import { fetchCase, patchCase } from "@/lib/api/cases";
import { lossesSchema } from "@/lib/intake/schemas";
import type { LossesSection } from "@/lib/intake/types";
import { INTAKE_STEPS } from "@/lib/intake/steps";

export default function LossesPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const t = (k: string) => k;

  const [loading, setLoading] = useState(true);

  const form = useForm<LossesSection>({
    resolver: zodResolver(lossesSchema),
    defaultValues: {},
    mode: "onBlur",
  });

  useEffect(() => {
    (async () => {
      const data = await fetchCase(caseId);
      form.reset(data.losses);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const prevHref = useMemo(() => INTAKE_STEPS.find((s) => s.key === "crime")!.path(caseId), [caseId]);
  const nextHref = useMemo(() => INTAKE_STEPS.find((s) => s.key === "medical")!.path(caseId), [caseId]);

  async function onSubmit(values: LossesSection) {
    await patchCase(caseId, { losses: values, lastSavedAt: new Date().toISOString() });
    router.push(nextHref);
  }

  if (loading) return <div className="p-6">{t("common.loading")}</div>;

  const wantsOther = form.watch("wantsOther");

  return (
    <IntakeShell title={"Losses & money" /* i18n later */} description={"Select what you want help paying for. This helps us generate your packet and check missing docs." /* i18n */}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <CheckboxField control={form.control} name="wantsMedical" label={"Medical bills"} />
          <CheckboxField control={form.control} name="wantsCounseling" label={"Counseling / therapy"} />
          <CheckboxField control={form.control} name="wantsLostWages" label={"Lost wages / income"} />
          <CheckboxField control={form.control} name="wantsFuneral" label={"Funeral / burial costs"} />
          <CheckboxField control={form.control} name="wantsPropertyLoss" label={"Property loss"} />
          <CheckboxField control={form.control} name="wantsRelocation" label={"Relocation / housing"} />
          <CheckboxField control={form.control} name="wantsOther" label={"Other"} />
        </div>

        {wantsOther ? (
          <TextField control={form.control} name="otherDescription" label={t("forms.labels.notes")} placeholder={t("forms.placeholders.typeHere")} />
        ) : null}

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