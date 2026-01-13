// app/api/translate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Lang = "auto" | "en" | "es";
type TargetLang = "en" | "es";

type TranslateSingleBody = {
  sourceLang?: Lang;          // default "auto"
  targetLang: TargetLang;     // required
  text: string;               // required
  context?: string;           // optional (e.g., "Victim compensation application")
};

type TranslateBatchBody = {
  sourceLang?: Lang;          // default "auto"
  targetLang: TargetLang;     // required
  items: Array<{ key: string; text: string }>; // required
  context?: string;           // optional
};

type RequestBody = TranslateSingleBody | TranslateBatchBody;

function isBatch(body: RequestBody): body is TranslateBatchBody {
  return (body as TranslateBatchBody).items !== undefined;
}

function cleanText(s: string) {
  return (s ?? "").toString().trim();
}

function langLabel(l: Lang | TargetLang) {
  if (l === "en") return "English";
  if (l === "es") return "Spanish";
  return "Auto-detect";
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const sourceLang: Lang = (body as any).sourceLang ?? "auto";
    const targetLang: TargetLang = (body as any).targetLang;
    const context = (body as any).context ?? "Victim compensation application intake";

    if (targetLang !== "en" && targetLang !== "es") {
      return NextResponse.json(
        { error: `Invalid targetLang. Expected "en" or "es".` },
        { status: 400 }
      );
    }

    // Build the content to translate
    let payload:
      | { mode: "single"; text: string }
      | { mode: "batch"; items: Array<{ key: string; text: string }> };

    if (isBatch(body)) {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) {
        return NextResponse.json(
          { error: "items[] is required for batch translation" },
          { status: 400 }
        );
      }

      // Keep only non-empty strings
      const cleaned = items
        .map((it) => ({ key: it.key, text: cleanText(it.text) }))
        .filter((it) => it.key && it.text);

      payload = { mode: "batch", items: cleaned };
    } else {
      const text = cleanText((body as TranslateSingleBody).text);
      if (!text) {
        return NextResponse.json(
          { error: "text is required for translation" },
          { status: 400 }
        );
      }
      payload = { mode: "single", text };
    }

    // IMPORTANT GUARDRAILS:
    // - Output ONLY translated text(s), no extra commentary
    // - Preserve punctuation, numbers, dates, capitalization, line breaks
    // - Do NOT translate proper nouns, names, addresses, emails, phone numbers, IDs
    // - If something is already in target language, keep it
    const system = [
      "You are a professional translation engine for sensitive legal-intake content.",
      "Return ONLY the translation output. No commentary, no explanations, no quotes unless present in the input.",
      "Preserve formatting: line breaks, bullet points, punctuation, capitalization, and numbers.",
      "Do NOT translate: names, street addresses, cities, states, ZIP codes, phone numbers, emails, IDs, report numbers, case numbers, organization names.",
      "If a segment is already in the target language, keep it as-is.",
    ].join("\n");

    const user = (() => {
      const from = langLabel(sourceLang);
      const to = langLabel(targetLang);

      if (payload.mode === "single") {
        return [
          `Context: ${context}`,
          `Translate from: ${from}`,
          `Translate to: ${to}`,
          "",
          "TEXT:",
          payload.text,
        ].join("\n");
      }

      // Batch: ask model to return JSON exactly
      return [
        `Context: ${context}`,
        `Translate from: ${from}`,
        `Translate to: ${to}`,
        "",
        "Return STRICT JSON with this shape and nothing else:",
        `{ "items": [ { "key": "string", "text": "string" } ] }`,
        "",
        "Translate these items:",
        JSON.stringify({ items: payload.items }, null, 2),
      ].join("\n");
    })();

    // Call OpenAI via REST (no SDK required)
    // Model choice: keep it stable and good at instruction-following.
    const model = process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "OpenAI request failed", details: errText },
        { status: 500 }
      );
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content ?? "";

    if (!content) {
      return NextResponse.json(
        { error: "Empty translation response" },
        { status: 500 }
      );
    }

    if (payload.mode === "single") {
      // Return as plain JSON
      return NextResponse.json({ text: content });
    }

    // Batch mode expects JSON. Parse safely.
    try {
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed?.items) ? parsed.items : [];

      // Normalize output shape
      return NextResponse.json({
        items: items
          .map((it: any) => ({
            key: String(it?.key ?? ""),
            text: String(it?.text ?? ""),
          }))
          .filter((it: any) => it.key && it.text),
      });
    } catch {
      // If model returned non-JSON, fail clearly (so you know immediately)
      return NextResponse.json(
        {
          error: "Batch translation returned non-JSON output",
          raw: content,
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error in /api/translate" },
      { status: 500 }
    );
  }
}