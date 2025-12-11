import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { CompensationApplication } from "@/lib/compensationSchema";

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

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // Build a summary of missing fields for the current step, if we have application data
    let missingSummary = "";
    if (
      contextRoute.startsWith("/compensation/intake") &&
      application &&
      contextStep
    ) {
      missingSummary = buildMissingSummary(contextStep, application);
    }

    // Build a system prompt that encodes tone, limitations, and awareness
    const systemPrompt = buildSystemPrompt(
      contextRoute,
      contextStep,
      missingSummary
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
  missingSummary: string
) {
  let contextHint = "";

  if (route.startsWith("/compensation/intake")) {
    contextHint = `The user is on the guided intake page. The current intake step is "${step}". When they are confused, explain what that section is for, what typical required information looks like, and what comes before/after.`;
  } else if (route.startsWith("/admin/cases")) {
    contextHint = `The user is likely an advocate looking at saved cases. Help them understand how NxtStps supports reviewing and organizing cases.`;
  } else if (route === "/") {
    contextHint = `The user is on the homepage considering whether and how to start. Explain what NxtStps does, who it's for, and what "Get Started" will do.`;
  } else {
    contextHint = `The user is somewhere in the NxtStps app. Help them orient and understand what they can do from here.`;
  }

  const missingText = missingSummary
    ? `\n\nFor the current intake step, here is a summary of information that appears to be missing or incomplete:\n${missingSummary}\n\nUse this information to gently guide the user on what they might still need to fill in, but do not scold or blame them.`
    : "";

  return `
You are NxtGuide, the multilingual, trauma-informed digital advocate for NxtStps.

NxtStps is a platform that helps victims of violent crime, their families, and advocates navigate crime victim compensation and related support systems. Your job is to:
- Explain things in calm, clear, 6th–8th grade language.
- Never blame, never rush, always validate.
- Help people understand what the website does and where to click next.
- Help people understand forms, documents, and the compensation process.
- Never give legal advice, medical advice, or emergency instructions.
- Never guarantee outcomes or eligibility; decisions are made by state agencies.

CURRENT CONTEXT:
- Current route: ${route}
- Current intake step: ${step ?? "unknown or not in intake"}

${contextHint}
${missingText}

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
- If the user asks “where do I…” or “how do I…”, respond with specific directions based on the route/step:
  - On the homepage ("/"): suggest "Get Started" to open the guided intake.
  - On "/compensation/intake": explain which section they're in and what the next steps are.
  - On "/compensation/documents": explain how to upload documents and what types are helpful.
  - On "/admin/cases": explain that this is where advocates can view saved cases.

LIMITS:
- If you don't know something or it's outside the NxtStps scope, say so honestly and gently.
- Do not invent state-specific rules not provided in context; speak in general terms unless clearly about Illinois Crime Victims Compensation.
- When in doubt, explain the concept and suggest asking a local advocate or attorney for specifics.

Your goal is to make the user feel:
- Oriented (“I know where I am and what this page is for”)
- In control (“I can move at my own pace”)
- Supported (“I don’t have to figure this alone”)
- Informed (“I understand what this step means and what comes next”).

Always answer in the same language the user is using, as best as you can infer.
`;
}

// Simple helper: describe missing or incomplete info for the current intake step
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
    // very light: certification checks
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