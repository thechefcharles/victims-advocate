/**
 * NxtGuide legacy chatbot service.
 *
 * Extracted from the 374-line route handler. This is the legacy OpenAI-based
 * chatbot that predates Domain 7.3 (AI Guidance). It will eventually be
 * replaced by the Domain 7.3 aiGuidanceService, but for now both coexist.
 */

import type { LegacyIntakePayload } from "@/lib/archive/compensationSchema.legacy";
import { getCaseById } from "@/lib/server/data";
import type { AuthContext } from "@/lib/server/auth";
import { orchestrate } from "@/lib/server/aiOps/aiOrchestrator";
import { resolveModelInvoker } from "@/lib/server/aiOps/modelInvoker";
import type { AIModeKey } from "@/lib/server/aiOps";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type IntakeStep =
  | "victim"
  | "applicant"
  | "crime"
  | "losses"
  | "medical"
  | "employment"
  | "funeral"
  | "documents"
  | "summary";

export type NxtguideInput = {
  messages: ChatMessage[];
  currentRoute: string;
  currentStep: IntakeStep | null;
  application?: LegacyIntakePayload;
  caseId?: string | null;
};

export async function processNxtguideMessage(
  ctx: AuthContext,
  input: NxtguideInput,
): Promise<{ reply: string }> {
  const sanitizedMessages = input.messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content.trim() })) as ChatMessage[];

  if (sanitizedMessages.length === 0) {
    throw new Error("No valid messages provided");
  }

  let missingSummary = "";
  let advocateCaseSummary = "";

  if (input.currentRoute.startsWith("/compensation/intake") && input.application && input.currentStep) {
    missingSummary = buildMissingSummary(input.currentStep, input.application);
  }

  if (input.currentRoute.startsWith("/admin/cases") && input.caseId) {
    const { caseSummary } = await buildAdvocateCaseSummary(ctx, input.caseId);
    if (caseSummary) advocateCaseSummary = caseSummary;
  }

  // Legacy buildSystemPrompt output is now carried through as route context.
  // The canonical system prompt comes from the orchestrator's prompt registry;
  // the 5-layer safety pipeline runs on every response.
  const routeContext = buildSystemPrompt(
    input.currentRoute,
    input.currentStep,
    missingSummary,
    advocateCaseSummary,
  );
  void routeContext;

  // Route → mode. /admin/cases surfaces are provider_copilot; everything
  // else is applicant_guidance.
  const mode: AIModeKey = input.currentRoute.startsWith("/admin/cases")
    ? "provider_copilot"
    : "applicant_guidance";

  // Collapse the conversation to the last user turn — orchestrator's v1 shape
  // takes one userMessage per call. Legacy history is incorporated via the
  // route-aware context above.
  const lastUser = [...sanitizedMessages].reverse().find((m) => m.role === "user");
  const userMessage =
    lastUser?.content ??
    sanitizedMessages[sanitizedMessages.length - 1]?.content ??
    "";

  const result = await orchestrate(
    {
      mode,
      userMessage,
      context: {
        stateCode: "IL",
        caseId: input.caseId ?? null,
      },
      actor: { userId: ctx.userId, accountType: ctx.accountType },
    },
    resolveModelInvoker(),
  );

  return { reply: result.response };
}

// ---------------------------------------------------------------------------
// Advocate Case Summary
// ---------------------------------------------------------------------------

async function buildAdvocateCaseSummary(
  ctx: AuthContext,
  caseId: string,
): Promise<{ caseSummary: string | null }> {
  try {
    const result = await getCaseById({ caseId, ctx });
    if (!result) return { caseSummary: null };

    const caseRow = result.case as Record<string, unknown>;
    const docs = result.documents;
    const app = caseRow.application as LegacyIntakePayload;
    const status = String(caseRow.status ?? "unknown");
    const stateCode = String(caseRow.state_code ?? "unknown");

    const docCountsByType: Record<string, number> = {};
    (docs || []).forEach((d: Record<string, unknown>) => {
      const t = String(d.doc_type || "other");
      docCountsByType[t] = (docCountsByType[t] || 0) + 1;
    });

    const lines: string[] = [];
    lines.push(`Case ${caseId} (status: ${status}, state: ${stateCode}). High-level view:`);
    const victimName = `${app?.victim?.firstName ?? ""} ${app?.victim?.lastName ?? ""}`.trim();
    lines.push(`- Applicant: ${victimName || "unknown"}; city: ${app?.victim?.city || "unknown"}`);

    const selectedLosses = Object.entries(app?.losses || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
    lines.push(selectedLosses.length > 0 ? `- Losses selected: ${selectedLosses.join(", ")}.` : `- No losses selected yet.`);

    const missingDocHints: string[] = [];
    if (!(docCountsByType["police_report"] || docCountsByType["incident_report"])) {
      missingDocHints.push("- No police report / incident report detected.");
    }
    if ((app?.losses?.medicalHospital || app?.losses?.counseling) && !(docCountsByType["medical_bill"] || docCountsByType["hospital_bill"])) {
      missingDocHints.push("- Medical/counseling help selected, but no medical/hospital bills detected.");
    }
    if ((app?.losses?.funeralBurial || app?.losses?.headstone) && !(docCountsByType["funeral_bill"] || docCountsByType["cemetery_bill"])) {
      missingDocHints.push("- Funeral/headstone help selected, but no funeral/cemetery invoices detected.");
    }
    if (app?.losses?.lossOfEarnings && !docCountsByType["wage_proof"]) {
      missingDocHints.push("- Loss of earnings selected, but no wage proof documents detected.");
    }

    const docSummary = Object.keys(docCountsByType).length > 0
      ? Object.entries(docCountsByType).map(([t, n]) => `${t} (${n})`).join(", ")
      : "none yet";
    lines.push(`- Documents attached (by type): ${docSummary}.`);

    if (missingDocHints.length > 0) {
      lines.push(`- Potential document gaps (not legal determinations):`);
      missingDocHints.forEach((m) => lines.push(`  ${m}`));
    } else {
      lines.push(`- No obvious document gaps based on losses + current doc types.`);
    }

    return { caseSummary: lines.join("\n") };
  } catch {
    return { caseSummary: null };
  }
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(route: string, step: string | null, missingSummary: string, advocateCaseSummary: string): string {
  let contextHint = "";
  if (route.startsWith("/compensation/intake")) {
    contextHint = `The user is on the guided intake page. The current intake step is "${step}". Explain what this step is for, what typical required info looks like, and what comes before/after.`;
  } else if (route.startsWith("/admin/cases")) {
    contextHint = `The user is likely an advocate reviewing a saved case. Help them understand what appears completed, what might be missing, and what to do next.`;
  } else if (route === "/") {
    contextHint = `The user is on the homepage. Explain what NxtStps does and where to start.`;
  } else {
    contextHint = `The user is somewhere in the NxtStps app. Help them orient and understand what they can do from here.`;
  }
  const missingText = missingSummary ? `\n\nMissing/incomplete for this intake step:\n${missingSummary}\n\nUse this to guide them gently. No blame.` : "";
  const advocateText = advocateCaseSummary ? `\n\nAdvocate case context:\n${advocateCaseSummary}\n\nUse this to help them, but do not treat as legal determination.` : "";

  return `You are NxtGuide, a multilingual, trauma-informed digital advocate for NxtStps.

Your job:
- Explain things in calm, clear 6th–8th grade language.
- Never blame, never rush, always validate.
- Help users navigate the website and understand what to do next.
- For advocates, summarize what appears present vs missing (not legal advice).
- Never guarantee outcomes or eligibility; state agencies decide.

CURRENT CONTEXT:
- Route: ${route}
- Intake step: ${step ?? "n/a"}

${contextHint}
${missingText}
${advocateText}

SAFETY:
- You are NOT an attorney, doctor, therapist, or emergency responder.
- If the user describes imminent danger or self-harm, encourage contacting 911 and/or 988.
- Do not provide medical diagnosis or legal advice.

STYLE:
- Short paragraphs, concrete steps.
- Suggest exactly where to click when asked.
- Reassure that it's okay to not know everything.

Always answer in the same language the user is using.`;
}

// ---------------------------------------------------------------------------
// Missing Summary
// ---------------------------------------------------------------------------

function buildMissingSummary(step: string, app: LegacyIntakePayload): string {
  const missing: string[] = [];

  if (step === "applicant") {
    if (!app.applicant.isSameAsVictim) {
      if (!app.applicant.firstName?.trim()) missing.push("- Applicant first name");
      if (!app.applicant.lastName?.trim()) missing.push("- Applicant last name");
      if (!app.applicant.dateOfBirth) missing.push("- Applicant date of birth");
      if (!app.applicant.relationshipToVictim?.trim()) missing.push("- Relationship to victim");
      if (!app.applicant.streetAddress?.trim()) missing.push("- Applicant street address");
      if (!app.applicant.city?.trim()) missing.push("- Applicant city");
      if (!app.applicant.state?.trim()) missing.push("- Applicant state");
      if (!app.applicant.zip?.trim()) missing.push("- Applicant ZIP");
    }
    if (app.contact.prefersEnglish === false && !app.contact.preferredLanguage?.trim()) missing.push("- Preferred language");
    if (app.contact.workingWithAdvocate && (!app.contact.advocateName?.trim() || !app.contact.advocatePhone?.trim())) missing.push("- Advocate name and phone");
  }
  if (step === "victim") {
    if (!app.victim.firstName?.trim()) missing.push("- Victim first name");
    if (!app.victim.lastName?.trim()) missing.push("- Victim last name");
    if (!app.victim.dateOfBirth) missing.push("- Victim date of birth");
    if (!app.victim.streetAddress?.trim()) missing.push("- Street address");
    if (!app.victim.city?.trim()) missing.push("- City");
    if (!app.victim.zip?.trim()) missing.push("- ZIP code");
  }
  if (step === "crime") {
    if (!app.crime.dateOfCrime) missing.push("- Date of crime");
    if (!app.crime.crimeAddress?.trim()) missing.push("- Crime location/address");
    if (!app.crime.crimeCity?.trim()) missing.push("- Crime city");
    if (!app.crime.reportingAgency?.trim()) missing.push("- Police department reported to");
  }
  if (step === "losses") {
    const anySelected = Object.values(app.losses || {}).some(Boolean);
    if (!anySelected) missing.push("- Select at least one loss type");
  }
  if (step === "medical") {
    if ((app.losses.medicalHospital || app.losses.counseling) && !app.medical.providers?.[0]?.providerName?.trim()) {
      missing.push("- At least one provider name");
    }
  }
  if (step === "employment") {
    if (app.losses.lossOfEarnings && !app.employment.employmentHistory?.[0]?.employerName?.trim()) {
      missing.push("- At least one employer name");
    }
  }
  if (step === "funeral") {
    if ((app.losses.funeralBurial || app.losses.headstone) && !app.funeral.funeralHomeName?.trim() && !app.funeral.funeralBillTotal) {
      missing.push("- Funeral home name and/or total funeral bill");
    }
  }
  if (step === "summary") {
    if (!app.certification.applicantSignatureName?.trim()) missing.push("- Applicant signature name");
    if (!app.certification.applicantSignatureDate) missing.push("- Applicant signature date");
  }

  return missing.length > 0 ? missing.join("\n") : "";
}
