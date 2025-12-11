import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { CompensationApplication } from "@/lib/compensationSchema";
import { supabaseServer } from "@/lib/supabaseServer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Type for messages sent from the frontend
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = (body.messages || []) as ChatMessage[];

    const contextRoute = (body.currentRoute || "/") as string;
    const contextStep = (body.currentStep || null) as
      | null
      | "victim"
      | "applicant"
      | "crime"
      | "losses"
      | "medical"
      | "employment"
      | "funeral"
      | "documents"
      | "summary";

    const application = body.application as CompensationApplication | undefined;
    const caseId = (body.caseId || null) as string | null;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    let missingSummary = "";
    let advocateCaseSummary = "";

    // 🟢 Intake context missing-field summary
    if (
      contextRoute.startsWith("/compensation/intake") &&
      application &&
      contextStep
    ) {
      missingSummary = buildMissingSummary(contextStep, application);
    }

    // 🟢 Advocate case + docs summary
    if (contextRoute.startsWith("/admin/cases") && caseId) {
      const { caseSummary, error } = await buildAdvocateCaseSummary(caseId);
      if (!error && caseSummary) {
        advocateCaseSummary = caseSummary;
      }
    }

    const systemPrompt = buildSystemPrompt(
      contextRoute,
      contextStep,
      missingSummary,
      advocateCaseSummary
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      reply: answer,
    });
  } catch (err: any) {
    console.error("[NxtGuide] Error:", err);
    return NextResponse.json(
      { error: "Failed to contact NxtGuide" },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(
  route: string,
  step: string | null,
  missingSummary: string,
  advocateCaseSummary: string
) {
  let contextHint = "";

  if (route.startsWith("/compensation/intake")) {
    contextHint = `The user is on the guided intake page. The current intake step is "${step}". When they are confused, explain what that section is for, what typical required information looks like, and what comes before/after.`;
  } else if (route.startsWith("/admin/cases")) {
    contextHint = `The user is likely an advocate looking at a specific saved case. Help them understand what appears to be completed, what might be missing, and how NxtStps supports reviewing and organizing cases.`;
  } else if (route === "/") {
    contextHint = `The user is on the homepage considering whether and how to start. Explain what NxtStps does, who it's for, and what "Get Started" will do.`;
  } else {
    contextHint = `The user is somewhere in the NxtStps app. Help them orient and understand what they can do from here.`;
  }

  const missingText = missingSummary
    ? `\n\nFor the current intake step, here is a summary of information that appears to be missing or incomplete:\n${missingSummary}\n\nUse this information to gently guide the user on what they might still need to fill in, but do not scold or blame them.`
    : "";

  const advocateText = advocateCaseSummary
    ? `\n\nAdvocate case context (for /admin/cases):\n${advocateCaseSummary}\n\nUse this to help advocates understand what is present and what might be missing, in plain, non-blaming language. Do not treat this as a legal determination; it's just a helpful overview.`
    : "";

  return `
You are NxtGuide, the multilingual, trauma-informed digital advocate for NxtStps.

NxtStps is a platform that helps victims of violent crime, their families, and advocates navigate crime victim compensation and related support systems. Your job is to:
- Explain things in calm, clear, 6th–8th grade language.
- Never blame, never rush, always validate.
- Help people understand what the website does and where to click next.
- Help people understand forms, documents, and the compensation process.
- For advocates, help them quickly see what appears to be present vs. missing in a case, but remind them this is just guidance, not a legal or eligibility decision.
- Never give legal advice, medical advice, or emergency instructions.
- Never guarantee outcomes or eligibility; decisions are made by state agencies.

CURRENT CONTEXT:
- Current route: ${route}
- Current intake step (if applicable): ${step ?? "unknown or not in intake"}

${contextHint}
${missingText}
${advocateText}

SAFETY & DISCLAIMERS:
- You are NOT an attorney, doctor, therapist, or emergency responder.
- If the user describes imminent danger, self-harm, or life-threatening situations, gently encourage them to contact local emergency services (911 in the U.S.), crisis hotlines (like 988), or trusted professionals.
- Do not provide diagnoses or treatment plans.
- Make it clear that NxtStps is a support tool, not a replacement for legal or clinical care.

TONE & STYLE:
- Calm, respectful, non-judgmental.
- Use short paragraphs and concrete examples.
- Frequently reassure the user that it's okay not to know things, and okay to go at their own pace.
- If the user is confused about the site, explain which buttons/links do what in simple UI language (“click ‘Start Application’ at the top”, “look for the ‘Documents’ step in your intake” etc.).

NAVIGATION & WEBSITE HELP:
- If the user asks “where do I…” or “how do I…”, respond with specific directions based on the route/step.
- On the advocate side ("/admin/cases"), assist with understanding what information and documents appear to be present vs missing, but do not speak as if you are the state agency.

LIMITS:
- If you don't know something or it's outside the NxtStps scope, say so honestly and gently.
- Do not invent state-specific rules not provided in context; speak in general terms unless clearly about Illinois Crime Victims Compensation.
- When in doubt, explain the concept and suggest asking a local advocate or attorney for specifics.

Your goal is to make the user feel:
- Oriented (“I know where I am and what this page is for”)
- In control (“I can move at my own pace”)
- Supported (“I don’t have to figure this alone”)
- Informed (“I understand what this step or case needs and what comes next”).

Always answer in the same language the user is using, as best as you can infer.
`;
}

// 🔹 Missing fields for intake (unchanged from last step)
function buildMissingSummary(
  step: string,
  app: CompensationApplication
): string {
  const missing: string[] = [];

  if (step === "victim") {
    if (!app.victim.firstName.trim()) missing.push("- Victim first name");
    if (!app.victim.lastName.trim()) missing.push("- Victim last name");
    if (!app.victim.dateOfBirth) missing.push("- Victim date of birth");
    if (!app.victim.streetAddress.trim()) missing.push("- Street address");
    if (!app.victim.city.trim()) missing.push("- City");
    if (!app.victim.zip.trim()) missing.push("- ZIP code");
  }

  if (step === "crime") {
    if (!app.crime.dateOfCrime) missing.push("- Date of crime");
    if (!app.crime.crimeAddress.trim())
      missing.push("- Where the crime happened (address or location)");
    if (!app.crime.crimeCity.trim())
      missing.push("- City where the crime happened");
    if (!app.crime.reportingAgency.trim())
      missing.push("- Police department the crime was reported to");
  }

  if (step === "losses") {
    const anySelected = Object.values(app.losses).some(Boolean);
    if (!anySelected) {
      missing.push(
        "- At least one type of loss selected (medical, funeral, lost wages, etc.)"
      );
    }
  }

  if (step === "medical") {
    if (app.losses.medicalHospital || app.losses.counseling) {
      if (!app.medical.providers[0]?.providerName) {
        missing.push(
          "- Name of at least one hospital, clinic, or therapist if you are asking for medical or counseling help"
        );
      }
    }
  }

  if (step === "employment") {
    if (app.losses.lossOfEarnings) {
      if (!app.employment.employmentHistory[0]?.employerName) {
        missing.push(
          "- Name of at least one employer if you are asking for help with lost earnings"
        );
      }
    }
  }

  if (step === "funeral") {
    if (app.losses.funeralBurial || app.losses.headstone) {
      if (!app.funeral.funeralHomeName && !app.funeral.funeralBillTotal) {
        missing.push(
          "- Basic funeral information (funeral home name and/or total funeral bill)"
        );
      }
    }
  }

  if (step === "summary") {
    if (!app.certification.applicantSignatureName) {
      missing.push("- Applicant signature name");
    }
    if (!app.certification.applicantSignatureDate) {
      missing.push("- Applicant signature date");
    }
  }

  if (missing.length === 0) {
    return "";
  }

  return `Based on the current application data, the following items may still be missing or incomplete on this step:\n${missing.join(
    "\n"
  )}`;
}

// 🔹 Advocate case + docs summary
async function buildAdvocateCaseSummary(caseId: string): Promise<{
  caseSummary: string | null;
  error?: string;
}> {
  try {
    const { data: caseRow, error: caseError } = await supabaseServer
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError || !caseRow) {
      console.error("[NxtGuide] Case fetch error:", caseError);
      return { caseSummary: null, error: "Case not found" };
    }

    const { data: docs, error: docsError } = await supabaseServer
      .from("documents")
      .select("*")
      .eq("case_id", caseId);

    if (docsError) {
      console.error("[NxtGuide] Documents fetch error:", docsError);
      return { caseSummary: null, error: "Documents fetch error" };
    }

    const app = caseRow.application as CompensationApplication;
    const status = caseRow.status as string;
    const stateCode = caseRow.state_code as string;

    const docCountsByType: Record<string, number> = {};
    (docs || []).forEach((d: any) => {
      const t = d.doc_type || "other";
      docCountsByType[t] = (docCountsByType[t] || 0) + 1;
    });

    const lines: string[] = [];

    lines.push(
      `Case ${caseId} (status: ${status}, state: ${stateCode}). High-level view:`
    );

    const victimName = `${app.victim.firstName} ${app.victim.lastName}`.trim();
    lines.push(
      `- Victim: ${victimName || "unknown"}; city: ${
        app.victim.city || "unknown"
      }`
    );

    const selectedLosses = Object.entries(app.losses)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (selectedLosses.length > 0) {
      lines.push(
        `- Losses selected in the application: ${selectedLosses.join(", ")}.`
      );
    } else {
      lines.push(`- No losses selected yet in the application.`);
    }

    // Check relevant docs vs losses
    const missingDocHints: string[] = [];

    // Police reports
    const hasPoliceDocs =
      (docCountsByType["police_report"] || 0) > 0 ||
      (docCountsByType["incident_report"] || 0) > 0;
    if (!hasPoliceDocs) {
      missingDocHints.push(
        "- No police report or incident report documents detected. If available, these are often important."
      );
    }

    // Medical bills
    if (app.losses.medicalHospital || app.losses.counseling) {
      const hasMedDocs =
        (docCountsByType["medical_bill"] || 0) > 0 ||
        (docCountsByType["hospital_bill"] || 0) > 0;
      if (!hasMedDocs) {
        missingDocHints.push(
          "- Application asks for medical/counseling help, but no medical or hospital bills detected yet."
        );
      }
    }

    // Funeral
    if (app.losses.funeralBurial || app.losses.headstone) {
      const hasFuneralDocs =
        (docCountsByType["funeral_bill"] || 0) > 0 ||
        (docCountsByType["cemetery_bill"] || 0) > 0;
      if (!hasFuneralDocs) {
        missingDocHints.push(
          "- Application asks for funeral/headstone help, but no funeral or cemetery invoices detected yet."
        );
      }
    }

    // Lost earnings
    if (app.losses.lossOfEarnings) {
      const hasWageDocs = (docCountsByType["wage_proof"] || 0) > 0;
      if (!hasWageDocs) {
        missingDocHints.push(
          "- Application asks for loss of earnings, but no wage proof documents (pay stubs, employer letters) detected yet."
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
      lines.push(
        `- Potential document gaps to be aware of (not legal determinations):`
      );
      missingDocHints.forEach((m) => lines.push(`  ${m}`));
    } else {
      lines.push(
        `- No obvious document gaps based on selected losses and available doc types.`
      );
    }

    return {
      caseSummary: lines.join("\n"),
    };
  } catch (err) {
    console.error("[NxtGuide] Unexpected error building advocate summary:", err);
    return { caseSummary: null, error: "Unexpected error" };
  }
}