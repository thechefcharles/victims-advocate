// app/api/nxtguide/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { CompensationApplication } from "@/lib/compensationSchema";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs"; // ✅ safest for OpenAI + server + Supabase

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type IntakeStep =
  | "victim"
  | "applicant"
  | "crime"
  | "losses"
  | "medical"
  | "employment"
  | "funeral"
  | "documents"
  | "summary";

export async function POST(req: Request) {
  try {
    const supabaseServer = getSupabaseServer(); // ✅ per-request client

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const messages = (body.messages || []) as ChatMessage[];
    const contextRoute = (body.currentRoute || "/") as string;
    const contextStep = (body.currentStep || null) as IntakeStep | null;

    const application = body.application as CompensationApplication | undefined;
    const caseId = (body.caseId || null) as string | null;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Basic shape validation so we don’t send junk to OpenAI
    const sanitizedMessages = messages
      .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role,
        content: m.content.trim(),
      })) as ChatMessage[];

    if (sanitizedMessages.length === 0) {
      return NextResponse.json({ error: "No valid messages provided" }, { status: 400 });
    }

    let missingSummary = "";
    let advocateCaseSummary = "";

    // ✅ Intake context missing-field summary
    if (contextRoute.startsWith("/compensation/intake") && application && contextStep) {
      missingSummary = buildMissingSummary(contextStep, application);
    }

    // ✅ Advocate case summary (case + docs)
    if (contextRoute.startsWith("/admin/cases") && caseId) {
      const { caseSummary } = await buildAdvocateCaseSummary(supabaseServer, caseId);
      if (caseSummary) advocateCaseSummary = caseSummary;
    }

    const systemPrompt = buildSystemPrompt(
      contextRoute,
      contextStep,
      missingSummary,
      advocateCaseSummary
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...sanitizedMessages],
      temperature: 0.3,
    });

    return NextResponse.json({
      reply: completion.choices[0]?.message?.content || "",
    });
  } catch (err) {
    console.error("[NxtGuide] Error:", err);
    return NextResponse.json({ error: "Failed to contact NxtGuide" }, { status: 500 });
  }
}

/* -----------------------------
   Advocate Case Summary Helper
------------------------------ */

async function buildAdvocateCaseSummary(
  supabaseServer: ReturnType<typeof getSupabaseServer>,
  caseId: string
): Promise<{ caseSummary: string | null; error?: string }> {
  try {
    const { data: caseRow, error: caseError } = await supabaseServer
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError || !caseRow) {
      return { caseSummary: null, error: "Case not found" };
    }

    const { data: docs, error: docsError } = await supabaseServer
      .from("documents")
      .select("*")
      .eq("case_id", caseId);

    if (docsError) {
      return { caseSummary: null, error: "Documents fetch error" };
    }

    const app = caseRow.application as CompensationApplication;
    const status = String(caseRow.status ?? "unknown");
    const stateCode = String(caseRow.state_code ?? "unknown");

    const docCountsByType: Record<string, number> = {};
    (docs || []).forEach((d: any) => {
      const t = d.doc_type || "other";
      docCountsByType[t] = (docCountsByType[t] || 0) + 1;
    });

    const lines: string[] = [];

    lines.push(`Case ${caseId} (status: ${status}, state: ${stateCode}). High-level view:`);

    const victimName = `${app?.victim?.firstName ?? ""} ${app?.victim?.lastName ?? ""}`.trim();
    lines.push(`- Victim: ${victimName || "unknown"}; city: ${app?.victim?.city || "unknown"}`);

    const selectedLosses = Object.entries(app?.losses || {})
      .filter(([_, v]) => Boolean(v))
      .map(([k]) => k);

    if (selectedLosses.length > 0) {
      lines.push(`- Losses selected: ${selectedLosses.join(", ")}.`);
    } else {
      lines.push(`- No losses selected yet.`);
    }

    const missingDocHints: string[] = [];

    // Police reports
    const hasPoliceDocs =
      (docCountsByType["police_report"] || 0) > 0 ||
      (docCountsByType["incident_report"] || 0) > 0;

    if (!hasPoliceDocs) {
      missingDocHints.push(
        "- No police report / incident report detected. If available, this is often important."
      );
    }

    // Medical/counseling docs
    if (app?.losses?.medicalHospital || app?.losses?.counseling) {
      const hasMedDocs =
        (docCountsByType["medical_bill"] || 0) > 0 ||
        (docCountsByType["hospital_bill"] || 0) > 0;

      if (!hasMedDocs) {
        missingDocHints.push(
          "- Medical/counseling help selected, but no medical/hospital bills detected yet."
        );
      }
    }

    // Funeral docs
    if (app?.losses?.funeralBurial || app?.losses?.headstone) {
      const hasFuneralDocs =
        (docCountsByType["funeral_bill"] || 0) > 0 ||
        (docCountsByType["cemetery_bill"] || 0) > 0;

      if (!hasFuneralDocs) {
        missingDocHints.push(
          "- Funeral/headstone help selected, but no funeral/cemetery invoices detected yet."
        );
      }
    }

    // Wage docs
    if (app?.losses?.lossOfEarnings) {
      const hasWageDocs = (docCountsByType["wage_proof"] || 0) > 0;
      if (!hasWageDocs) {
        missingDocHints.push(
          "- Loss of earnings selected, but no wage proof documents detected yet."
        );
      }
    }

    lines.push(
      `- Documents attached (by type): ${
        Object.keys(docCountsByType).length > 0
          ? Object.entries(docCountsByType)
              .map(([t, n]) => `${t} (${n})`)
              .join(", ")
          : "none yet"
      }.`
    );

    if (missingDocHints.length > 0) {
      lines.push(`- Potential document gaps (not legal determinations):`);
      missingDocHints.forEach((m) => lines.push(`  ${m}`));
    } else {
      lines.push(`- No obvious document gaps based on losses + current doc types.`);
    }

    return { caseSummary: lines.join("\n") };
  } catch (err) {
    console.error("[NxtGuide] Unexpected error building advocate summary:", err);
    return { caseSummary: null, error: "Unexpected error" };
  }
}

/* -----------------------------
   System Prompt Builder
------------------------------ */

function buildSystemPrompt(
  route: string,
  step: string | null,
  missingSummary: string,
  advocateCaseSummary: string
) {
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

  const missingText = missingSummary
    ? `\n\nMissing/incomplete for this intake step:\n${missingSummary}\n\nUse this to guide them gently. No blame.`
    : "";

  const advocateText = advocateCaseSummary
    ? `\n\nAdvocate case context:\n${advocateCaseSummary}\n\nUse this to help them, but do not treat as legal determination.`
    : "";

  return `
You are NxtGuide, a multilingual, trauma-informed digital advocate for NxtStps.

Your job:
- Explain things in calm, clear 6th–8th grade language.
- Never blame, never rush, always validate.
- Help users navigate the website and understand what to do next.
- Help explain forms and documents in plain language.
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
- If the user describes imminent danger or self-harm, encourage contacting 911 (US) and/or 988.
- Do not provide medical diagnosis or legal advice.

STYLE:
- Short paragraphs, concrete steps.
- Suggest exactly where to click when asked.
- Reassure that it’s okay to not know everything.

Always answer in the same language the user is using.
`;
}

/* -----------------------------
   Missing Summary Builder
------------------------------ */

function buildMissingSummary(step: string, app: CompensationApplication): string {
  const missing: string[] = [];

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
    if (!anySelected) missing.push("- Select at least one loss type (medical, funeral, wages, etc.)");
  }

  if (step === "medical") {
    if (app.losses.medicalHospital || app.losses.counseling) {
      if (!app.medical.providers?.[0]?.providerName?.trim()) {
        missing.push("- At least one provider name (if asking for medical/counseling help)");
      }
    }
  }

  if (step === "employment") {
    if (app.losses.lossOfEarnings) {
      if (!app.employment.employmentHistory?.[0]?.employerName?.trim()) {
        missing.push("- At least one employer name (if asking for loss of earnings)");
      }
    }
  }

  if (step === "funeral") {
    if (app.losses.funeralBurial || app.losses.headstone) {
      if (!app.funeral.funeralHomeName?.trim() && !app.funeral.funeralBillTotal) {
        missing.push("- Funeral home name and/or total funeral bill (if asking for funeral help)");
      }
    }
  }

  if (step === "summary") {
    if (!app.certification.applicantSignatureName?.trim()) missing.push("- Applicant signature name");
    if (!app.certification.applicantSignatureDate) missing.push("- Applicant signature date");
  }

  if (missing.length === 0) return "";
  return missing.join("\n");
}