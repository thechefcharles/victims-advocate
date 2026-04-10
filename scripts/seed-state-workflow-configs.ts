/**
 * Domain 2.2 — State Workflows: seeding script.
 *
 * Reads Base Truth TypeScript modules and produces baseline state_workflow_configs
 * (one per supported state) plus all child sets. Safe to re-run: checks for an
 * existing version_number=1 row per state and updates child sets in place.
 *
 * Run:
 *   npx tsx scripts/seed-state-workflow-configs.ts
 *
 * Dry-run (no DB writes — prints planned row counts only):
 *   SEED_DRY_RUN=1 npx tsx scripts/seed-state-workflow-configs.ts
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (loaded via lib/config).
 *
 * Source files (Base Truth — never modified by this script):
 *   lib/compensationSchema.ts        — IL + IN shared field structure
 *   lib/eligibilitySchema.ts         — IL eligibility decision tree
 *   lib/eligibilitySchemaIN.ts       — IN eligibility decision tree
 *   lib/pdfMaps/il_cvc_fieldMap.ts   — IL output (PDF) field mapping
 *   lib/pdfMaps/in_cvc_coords.ts     — IN output coordinate mapping
 */

import { IL_CVC_FIELD_MAP } from "@/lib/pdfMaps/il_cvc_fieldMap";
import { IN_CVC_COORDS } from "@/lib/pdfMaps/in_cvc_coords";
import { emptyEligibilityAnswersIN } from "@/lib/eligibilitySchemaIN";
import { emptyCompensationApplication } from "@/lib/compensationSchema";

// ---------------------------------------------------------------------------
// Plan derivation — pure, no DB calls
// ---------------------------------------------------------------------------

type SeedPlan = {
  state_code: "IL" | "IN";
  display_name: string;
  seeded_from: string;
  intake_schema_payload: Record<string, unknown>;
  eligibility_rules_payload: Record<string, unknown>;
  document_requirements_payload: Record<string, unknown>;
  output_field_metadata: Array<{
    fieldId: string;
    sourcePath: string;
    page?: number;
    x?: number;
    y?: number;
    type?: "text" | "date" | "checkbox" | "phone";
  }>;
  form_field_metadata: Array<{
    fieldId: string;
    sourcePath: string;
    page?: number;
    x?: number;
    y?: number;
    type?: "text" | "date" | "checkbox" | "phone";
  }>;
  translation_payload: Record<string, unknown>;
  disclaimers_payload: unknown[];
};

function buildIntakeSchemaPayload(): Record<string, unknown> {
  // Walk the empty application as the structural blueprint. Top-level keys
  // are the canonical step keys; nested object keys become field paths.
  const steps: Array<{ stepKey: string; fieldPaths: string[] }> = [];
  for (const [stepKey, stepValue] of Object.entries(emptyCompensationApplication)) {
    if (stepValue === null || typeof stepValue !== "object") {
      steps.push({ stepKey, fieldPaths: [stepKey] });
      continue;
    }
    if (Array.isArray(stepValue)) {
      steps.push({ stepKey, fieldPaths: [`${stepKey}[]`] });
      continue;
    }
    const fields = Object.keys(stepValue as Record<string, unknown>).map(
      (k) => `${stepKey}.${k}`,
    );
    steps.push({ stepKey, fieldPaths: fields });
  }
  return {
    schema_version: "v1",
    derived_from: "lib/compensationSchema.ts:emptyCompensationApplication",
    steps,
    field_count: steps.reduce((sum, s) => sum + s.fieldPaths.length, 0),
  };
}

function buildIlEligibilityRules(): Record<string, unknown> {
  return {
    schema_version: "v1",
    derived_from: "lib/eligibilitySchema.ts",
    questions: [
      "applicantType",
      "victimStatus",
      "signer",
      "policeReport",
      "policeReportDetails",
      "expensesType",
      "expensesAmount",
    ],
    outcome_codes: ["eligible", "needs_review", "not_eligible"],
    readiness_codes: ["ready", "missing_info", "not_ready"],
  };
}

function buildInEligibilityRules(): Record<string, unknown> {
  return {
    schema_version: "v1",
    derived_from: "lib/eligibilitySchemaIN.ts",
    answer_keys: Object.keys(emptyEligibilityAnswersIN),
    outcome_codes: ["eligible", "needs_review", "not_eligible"],
    readiness_codes: ["ready", "missing_info", "not_ready"],
  };
}

function buildDocumentRequirements(stateCode: "IL" | "IN"): Record<string, unknown> {
  // Baseline document categories shared across states. Per-state additions can
  // be appended later via admin tooling.
  return {
    schema_version: "v1",
    state_code: stateCode,
    required_categories: [
      "police_report",
      "medical_records",
      "wage_loss_documentation",
      "funeral_invoice",
      "victim_identification",
    ],
    optional_categories: ["counseling_records", "supporting_correspondence"],
  };
}

function buildIlOutputFieldMetadata(): SeedPlan["output_field_metadata"] {
  // We do NOT serialize the getter function bodies. Instead we record the
  // field key and a derived sourcePath placeholder. Runtime PDF generation
  // continues to call IL_CVC_FIELD_MAP[fieldId] from the in-code helper.
  return Object.keys(IL_CVC_FIELD_MAP).map((fieldId) => ({
    fieldId,
    sourcePath: `IL_CVC_FIELD_MAP["${fieldId}"]`,
    type: "text",
  }));
}

function buildInOutputFieldMetadata(): SeedPlan["output_field_metadata"] {
  return IN_CVC_COORDS.map((item, idx) => ({
    fieldId: `in_cvc_field_${idx}`,
    sourcePath: `IN_CVC_COORDS[${idx}]`,
    page: item.pageIndex,
    x: item.x,
    y: item.y,
    type: "text",
  }));
}

function buildPlanForIL(): SeedPlan {
  const outputFields = buildIlOutputFieldMetadata();
  return {
    state_code: "IL",
    display_name: "Illinois Crime Victim Compensation v1",
    seeded_from:
      "lib/compensationSchema.ts + lib/pdfMaps/il_cvc_fieldMap.ts + lib/eligibilitySchema.ts",
    intake_schema_payload: buildIntakeSchemaPayload(),
    eligibility_rules_payload: buildIlEligibilityRules(),
    document_requirements_payload: buildDocumentRequirements("IL"),
    output_field_metadata: outputFields,
    form_field_metadata: outputFields,
    translation_payload: {},
    disclaimers_payload: [],
  };
}

function buildPlanForIN(): SeedPlan {
  const outputFields = buildInOutputFieldMetadata();
  return {
    state_code: "IN",
    display_name: "Indiana Violent Crime Victim Compensation v1",
    seeded_from:
      "lib/compensationSchema.ts + lib/pdfMaps/in_cvc_coords.ts + lib/eligibilitySchemaIN.ts",
    intake_schema_payload: buildIntakeSchemaPayload(),
    eligibility_rules_payload: buildInEligibilityRules(),
    document_requirements_payload: buildDocumentRequirements("IN"),
    output_field_metadata: outputFields,
    form_field_metadata: outputFields,
    translation_payload: {},
    disclaimers_payload: [],
  };
}

// ---------------------------------------------------------------------------
// DB execution
// ---------------------------------------------------------------------------

type RowCounts = {
  configs: number;
  intake_schemas: number;
  eligibility_rule_sets: number;
  document_requirement_sets: number;
  translation_mapping_sets: number;
  output_mapping_sets: number;
  form_template_sets: number;
  disclaimer_sets: number;
};

function emptyCounts(): RowCounts {
  return {
    configs: 0,
    intake_schemas: 0,
    eligibility_rule_sets: 0,
    document_requirement_sets: 0,
    translation_mapping_sets: 0,
    output_mapping_sets: 0,
    form_template_sets: 0,
    disclaimer_sets: 0,
  };
}

async function applyPlan(
  plan: SeedPlan,
  counts: RowCounts,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    counts.configs += 1;
    counts.intake_schemas += 1;
    counts.eligibility_rule_sets += 1;
    counts.document_requirement_sets += 1;
    counts.translation_mapping_sets += 1;
    counts.output_mapping_sets += 1;
    counts.form_template_sets += 1;
    counts.disclaimer_sets += 1;
    console.log(
      `[seed] [dry-run] ${plan.state_code} — would seed config + 7 child sets ` +
        `(intake fields=${plan.intake_schema_payload.field_count ?? "n/a"}, ` +
        `output fields=${plan.output_field_metadata.length})`,
    );
    return;
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
  const {
    insertConfig,
    insertIntakeSchema,
    insertEligibilityRuleSet,
    insertDocumentRequirementSet,
    insertTranslationMappingSet,
    insertOutputMappingSet,
    insertFormTemplateSet,
    insertDisclaimerSet,
  } = await import("@/lib/server/stateWorkflows/stateWorkflowRepository");
  const supabase = getSupabaseAdmin();

  // Look for an existing version_number=1 row for this state
  const { data: existing } = await supabase
    .from("state_workflow_configs")
    .select("id")
    .eq("state_code", plan.state_code)
    .eq("version_number", 1)
    .maybeSingle();

  let configId: string;
  if (existing && (existing as { id?: string }).id) {
    configId = (existing as { id: string }).id;
    console.log(`[seed] ${plan.state_code} v1 exists (${configId}) — refreshing children`);
    // Wipe children to make this re-runnable
    const childTables = [
      "intake_schemas",
      "eligibility_rule_sets",
      "document_requirement_sets",
      "translation_mapping_sets",
      "output_mapping_sets",
      "form_template_sets",
      "disclaimer_sets",
    ] as const;
    for (const t of childTables) {
      await supabase.from(t).delete().eq("config_id", configId);
    }
  } else {
    const inserted = await insertConfig(supabase, {
      state_code: plan.state_code,
      display_name: plan.display_name,
      seeded_from: plan.seeded_from,
      version_number: 1,
      created_by: null,
    });
    configId = inserted.id;
    counts.configs += 1;
    console.log(`[seed] ${plan.state_code} v1 created (${configId})`);
  }

  await insertIntakeSchema(supabase, configId, plan.intake_schema_payload);
  counts.intake_schemas += 1;

  await insertEligibilityRuleSet(supabase, configId, plan.eligibility_rules_payload);
  counts.eligibility_rule_sets += 1;

  await insertDocumentRequirementSet(
    supabase,
    configId,
    plan.document_requirements_payload,
  );
  counts.document_requirement_sets += 1;

  await insertTranslationMappingSet(supabase, configId, "es", plan.translation_payload);
  counts.translation_mapping_sets += 1;

  await insertOutputMappingSet(
    supabase,
    configId,
    plan.state_code === "IL" ? "il_cvc" : "in_cvc",
    plan.output_field_metadata,
  );
  counts.output_mapping_sets += 1;

  await insertFormTemplateSet(
    supabase,
    configId,
    plan.state_code === "IL" ? "il_cvc" : "in_cvc",
    plan.form_field_metadata,
  );
  counts.form_template_sets += 1;

  await insertDisclaimerSet(supabase, configId, plan.disclaimers_payload);
  counts.disclaimer_sets += 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.env.SEED_DRY_RUN === "1";
  const counts = emptyCounts();

  const ilPlan = buildPlanForIL();
  const inPlan = buildPlanForIN();

  console.log(
    `[seed] state-workflow-configs — ${dryRun ? "DRY RUN" : "LIVE"} — ` +
      `IL output fields: ${ilPlan.output_field_metadata.length}, ` +
      `IN output fields: ${inPlan.output_field_metadata.length}, ` +
      `intake schema fields per state: ${
        (ilPlan.intake_schema_payload.field_count as number) ?? "n/a"
      }`,
  );

  await applyPlan(ilPlan, counts, dryRun);
  await applyPlan(inPlan, counts, dryRun);

  console.log("[seed] row counts:", counts);
  console.log("[seed] done.");
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
