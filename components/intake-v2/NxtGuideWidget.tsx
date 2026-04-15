"use client";

/**
 * NxtGuide chat widget for intake-v2.
 *
 * Floating bottom-right. Wraps POST /api/nxtguide with a small conversational
 * state (messages live only in component state — no persistence). Starter
 * prompts swap per section. Widget does not surface an escalation banner
 * because /api/nxtguide's response shape is `{ reply: string }` — it carries
 * no escalation/urgency signal. The separate /api/ai-guidance/sessions/…
 * endpoint does emit escalations, but this widget targets the simpler route.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ApiStep =
  | "victim"
  | "applicant"
  | "crime"
  | "losses"
  | "medical"
  | "employment"
  | "funeral"
  | "documents"
  | "summary"
  | null;

// Intake-v2 section keys → the enum the /api/nxtguide route accepts.
const SECTION_TO_API_STEP: Record<string, ApiStep> = {
  victim_info: "victim",
  applicant_info: "applicant",
  contact_info: "applicant",
  crime_info: "crime",
  protection_civil: "crime",
  losses_claimed: "losses",
  medical: "medical",
  employment: "employment",
  funeral: "funeral",
  certification: "summary",
};

const DEFAULT_PROMPTS = [
  "What documents do I need?",
  "What is the filing deadline?",
  "Who can help me fill this out?",
];

const STARTER_PROMPTS: Record<string, string[]> = {
  victim_info: [
    "What if the victim is deceased?",
    "What if I am both the victim and applicant?",
  ],
  crime_info: [
    "What if I don't have a police report?",
    "What counts as a violent crime in Illinois?",
  ],
  losses_claimed: [
    "What expenses does this program cover?",
    "Can I claim counseling costs?",
  ],
  medical: [
    "What if I don't have all my bills yet?",
    "What is a collateral source?",
  ],
  certification: [
    "What does subrogation mean?",
    "Is my typed name legally binding?",
  ],
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  currentSectionKey: string | null;
  stateCode: string;
}

export function NxtGuideWidget({ currentSectionKey, stateCode }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const starterPrompts = useMemo(() => {
    if (currentSectionKey && STARTER_PROMPTS[currentSectionKey]) {
      return STARTER_PROMPTS[currentSectionKey];
    }
    return DEFAULT_PROMPTS;
  }, [currentSectionKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setInput("");
    setError(null);
    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const apiStep: ApiStep = currentSectionKey
        ? SECTION_TO_API_STEP[currentSectionKey] ?? null
        : null;
      const r = await fetch("/api/nxtguide", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          currentRoute: `/compensation/intake-v2?stateCode=${stateCode}`,
          currentStep: apiStep,
        }),
      });
      const body = (await r.json().catch(() => null)) as
        | { ok: true; data: { reply: string } }
        | { ok: false; error: { message: string } }
        | { reply?: string }
        | null;
      if (!r.ok || !body) {
        throw new Error(
          body && "error" in body && body.error ? body.error.message : `HTTP ${r.status}`,
        );
      }
      const reply =
        "data" in body && body.data?.reply
          ? body.data.reply
          : "reply" in body && typeof body.reply === "string"
            ? body.reply
            : "";
      if (!reply) throw new Error("Empty response from NxtGuide.");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          className="flex h-[420px] w-[300px] flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg"
          role="dialog"
          aria-label="NxtGuide help chat"
        >
          <header className="flex items-center justify-between border-b border-gray-200 bg-blue-600 px-3 py-2 text-white">
            <div className="text-sm font-medium">NxtGuide</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs opacity-90 hover:opacity-100"
              aria-label="Close chat"
            >
              ✕
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm">
            {messages.length === 0 && (
              <div className="space-y-2 pt-1 text-gray-600">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ask about this section
                </p>
                {starterPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => void send(p)}
                    className="block w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-100"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-blue-600 px-3 py-1.5 text-white"
                      : "max-w-[85%] rounded-2xl bg-gray-100 px-3 py-1.5 text-gray-900"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl bg-gray-100 px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-700">Error: {error}</p>}
          </div>

          <form
            className="flex gap-1 border-t border-gray-200 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
        aria-expanded={open}
        aria-label={open ? "Close NxtGuide" : "Open NxtGuide"}
      >
        <span aria-hidden>💬</span>
        <span>{open ? "Close" : "Get Help"}</span>
      </button>
    </div>
  );
}
