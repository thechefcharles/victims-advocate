"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const audiences = [
  "Victims",
  "Advocates",
  "Case Managers",
  "Community Organizations",
  "Hospitals & Medical Providers",
  "Government Departments",
] as const;

type Audience = (typeof audiences)[number];

export default function HomePage() {
  const [activeAudience, setActiveAudience] = useState<Audience>("Victims");

    const router = useRouter();

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/login");
};

  // 🔹 NxtGuide chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);

  // 🔹 NxtGuide chat submit handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const newMessages = [
      ...chatMessages,
      { role: "user" as const, content: trimmed },
    ];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/nxtguide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          currentRoute: "/",
          currentStep: null,
        }),
      });

      if (!res.ok) {
        console.error("NxtGuide error:", await res.text());
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I had trouble responding just now. Please try again in a moment.",
          },
        ]);
        return;
      }

      const json = await res.json();
      const reply = (json.reply as string) || "";

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      console.error("NxtGuide error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I ran into a technical problem while trying to respond. Please try again shortly.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50">
      {/* Top nav */}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 space-y-16">
        {/* HERO SECTION */}
        <section className="grid gap-10 md:grid-cols-[3fr,2fr] items-center">
          <div className="space-y-5">
            <p className="text-[11px] tracking-[0.22em] uppercase text-slate-400">
              Trauma-Informed · AI-Powered · State-Aligned
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-50">
              Victim support, made simple.
              <br />
              <span className="text-[#F2C94C]">
                Your benefits. Your rights. One clear path.
              </span>
            </h1>
            <p className="max-w-xl text-sm sm:text-base text-slate-200">
              NxtStps guides you step-by-step through crime victim compensation,
              explains your options in plain language, and helps you avoid the
              paperwork mistakes that cause delays and denials.
            </p>

            {/* Progress bar visual */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Guided Application Progress</span>
                <span>Step 1 of 3</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-1/3 bg-gradient-to-r from-[#1C8C8C] to-[#F2C94C]" />
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/compensation/intake"
                className="inline-flex items-center rounded-full bg-[#1C8C8C] px-5 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-black/30 hover:bg-[#21a3a3] transition"
              >
                Get Started
                <span className="ml-2 text-xs text-slate-900/80">
                  Start your application →
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="inline-flex items-center rounded-full border border-slate-600 bg-transparent px-4 py-2 text-xs font-medium text-slate-100 hover:bg-slate-900/70 transition"
              >
                Speak with our advocate chatbot
              </button>
            </div>

            <p className="text-[11px] text-slate-500 max-w-md">
              NxtStps is a supportive tool. It does not replace legal advice,
              emergency services, or medical care. You can pause at any time
              and return when you&apos;re ready.
            </p>
          </div>

          {/* Right-hand abstract “device” / illustration */}
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-tr from-[#1C8C8C]/10 via-[#F2C94C]/5 to-transparent blur-3xl opacity-80 pointer-events-none" />
            <div className="relative rounded-3xl border border-slate-700 bg-gradient-to-b from-[#0A2239] to-[#020b16] p-5 shadow-lg shadow-black/40 space-y-4">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-medium uppercase tracking-[0.18em]">
                  NxtStps Guided Path
                </span>
                <span className="rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-slate-400">
                  Draft preview
                </span>
              </div>
              <ol className="space-y-2 text-xs">
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1C8C8C] text-[10px] font-bold text-slate-950">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">
                      Tell us what happened
                    </p>
                    <p className="text-[11px] text-slate-400">
                      We ask one question at a time in calm, clear language.
                    </p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F2C94C] text-[10px] font-bold text-slate-950">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">
                      Collect & pre-check your documents
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Upload police reports, medical bills, and other proof.
                      We scan for missing or mismatched details.
                    </p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-200">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">
                      File with confidence
                    </p>
                    <p className="text-[11px] text-slate-400">
                      You review a clean draft packet before anything is sent
                      to the state.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="mt-4 rounded-2xl bg-slate-900/70 p-3 text-[11px] text-slate-300">
                “You don&apos;t have to figure this out alone. NxtStps walks with
                you, step by step, at your pace.”
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em]">
            Built for the real victim-services ecosystem
          </p>
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
            <Badge>Built with victim advocates & case managers</Badge>
            <Badge>Aligned with state compensation rules</Badge>
            <Badge>AI-powered denial-prevention engine</Badge>
            <Badge>Secure, encrypted, confidential</Badge>
          </div>
        </section>

        {/* WHAT NXTSTPS HELPS WITH (FEATURE TILES) */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
              What NxtStps helps you with
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <FeatureCard
              title="Eligibility checker"
              body="Answers a few key questions and gently explains if you may qualify, why, and what to do next."
            />
            <FeatureCard
              title="Denial-prevention engine"
              body="Maps the most common denial reasons to automated checks that catch problems before you file."
            />
            <FeatureCard
              title="Automatic document organizer"
              body="Police reports, medical bills, funeral invoices, and wage proof—structured and ready for review."
            />
            <FeatureCard
              title="Application builder"
              body="Transforms the state’s complex forms into plain-language steps with examples and explanations."
            />
            <FeatureCard
              title="Multilingual advocate chatbot"
              body="NxtGuide explains the process in your preferred language, asks questions gently, and stays trauma-informed."
            />
            <FeatureCard
              title="State-by-state support"
              body="Adapts to each state’s categories, documentation rules, and deadlines so your application stays compliant."
            />
          </div>
        </section>

        {/* WHO THIS TOOL IS FOR */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
            Who NxtStps supports
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            NxtStps is designed for everyone who touches the victim-services
            journey—from survivors themselves to advocates, hospitals, and state
            agencies.
          </p>

          {/* Tabs on desktop, stacked buttons on mobile */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            {audiences.map((aud) => (
              <button
                key={aud}
                type="button"
                onClick={() => setActiveAudience(aud)}
                className={`rounded-full border px-3 py-1.5 transition ${
                  activeAudience === aud
                    ? "border-[#1C8C8C] bg-[#1C8C8C]/15 text-[#F7F1E5]"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-[#1C8C8C]"
                }`}
              >
                {aud}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 text-xs sm:text-sm text-slate-200">
            {activeAudience === "Victims" && (
              <ul className="space-y-1.5">
                <li>• Understand your rights in clear, human language.</li>
                <li>• Apply confidently with step-by-step guidance.</li>
                <li>• Avoid common mistakes that delay or deny claims.</li>
              </ul>
            )}
            {activeAudience === "Advocates" && (
              <ul className="space-y-1.5">
                <li>• Streamline caseloads with automated workflows.</li>
                <li>• Reduce incomplete submissions and preventable errors.</li>
                <li>
                  • Maintain trauma-informed care while saving significant time.
                </li>
              </ul>
            )}
            {activeAudience === "Case Managers" && (
              <ul className="space-y-1.5">
                <li>• Manage complex cases with organized documentation.</li>
                <li>• Track application status across clients in one place.</li>
                <li>• Ensure accuracy, compliance, and timely follow-through.</li>
              </ul>
            )}
            {activeAudience === "Community Organizations" && (
              <ul className="space-y-1.5">
                <li>
                  • Centralize victim-support work across outreach, advocacy,
                  and admin teams.
                </li>
                <li>• Improve internal coordination and warm hand-offs.</li>
                <li>• Access aggregate reporting to strengthen funding.</li>
              </ul>
            )}
            {activeAudience === "Hospitals & Medical Providers" && (
              <ul className="space-y-1.5">
                <li>• Simplify bill submission and verification workflows.</li>
                <li>• Reduce burden on social workers and billing teams.</li>
                <li>
                  • Help patients access financial assistance quickly and
                  accurately.
                </li>
              </ul>
            )}
            {activeAudience === "Government Departments" && (
              <ul className="space-y-1.5">
                <li>• Receive cleaner, more complete applications.</li>
                <li>• Reduce backlogs by standardizing error-free packets.</li>
                <li>• Increase transparency, compliance, and public trust.</li>
              </ul>
            )}
          </div>
        </section>

        {/* TRANSPARENCY & EFFICIENCY PROMISE */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-3">
          <p className="text-sm sm:text-base font-semibold text-slate-50">
            Victim services should be fast, clear, and fair.
          </p>
          <p className="text-xs sm:text-sm text-slate-300">
            NxtStps eliminates confusion, missing documents, and preventable
            denials—giving survivors and advocates a stable, transparent path
            to support.
          </p>
          <ul className="grid gap-2 text-[11px] text-slate-300 sm:grid-cols-2">
            <li>• No hidden fees.</li>
            <li>• No judgment.</li>
            <li>• No confusing legal language.</li>
            <li>• Built for accuracy, dignity, and equity.</li>
          </ul>
        </section>

        {/* REAL EXAMPLES OF DENIAL PREVENTION */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
            Real examples of denial prevention
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <MiniCard
              title="Missing police report?"
              body="NxtStps detects when a police report number is missing or doesn&apos;t match your story, and helps you fix it before you submit."
            />
            <MiniCard
              title="Medical receipt mismatch?"
              body="We compare the bills you upload with what you enter so that amounts, dates, and providers line up cleanly for reviewers."
            />
            <MiniCard
              title="Not sure if you&apos;re eligible?"
              body="We walk through key eligibility rules in plain language and flag where you may need more information or support."
            />
          </div>
        </section>

        {/* STATE SELECTOR + SAFETY / PRIVACY */}
        <section className="grid gap-6 md:grid-cols-[2fr,3fr] items-start">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-slate-50">
              Tailored to your state
            </h3>
            <p className="text-slate-300">
              NxtStps will support multiple states. For now, we&apos;re focused
              on Illinois Crime Victims Compensation—but the architecture is
              ready to expand.
            </p>
            <label className="block space-y-1 text-[11px] text-slate-200">
              <span>Select your state (preview)</span>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-50"
                defaultValue="IL"
              >
                <option value="IL">Illinois (current focus)</option>
                <option disabled>More states coming soon…</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-slate-50">
              Safety & privacy, by design
            </h3>
            <ul className="space-y-1.5 text-slate-300">
              <li>• Your information is encrypted in transit and at rest.</li>
              <li>• You control what is shared and when.</li>
              <li>• Nothing is submitted to the state without your consent.</li>
              <li>• You may pause or exit at any time.</li>
            </ul>
          </div>
        </section>

        {/* MULTILINGUAL SUPPORT BANNER */}
        <section className="rounded-2xl border border-[#1C8C8C]/40 bg-[#1C8C8C]/10 px-4 py-3 text-[11px] text-slate-50 flex flex-wrap items-center justify-between gap-2">
          <p>
            <span className="font-semibold">Multilingual support.</span> NxtStps
            is being built to support 100+ languages, with instant translation
            and trauma-informed guidance.
          </p>
          <span className="rounded-full bg-slate-900/60 px-3 py-1 text-[10px] text-slate-300">
            English · Spanish · More coming soon
          </span>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-[#020813] mt-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>© {new Date().getFullYear()} NxtStps. All rights reserved.</p>
            <p className="max-w-md">
              NxtStps is a trauma-informed digital toolkit. It does not replace
              legal advice, emergency services, or mental-health care.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/knowledge/compensation" className="hover:text-slate-200">
              Resource Library
            </Link>
            <Link href="/compensation" className="hover:text-slate-200">
              For Victims
            </Link>
            <Link href="/admin/cases" className="hover:text-slate-200">
              For Advocates
            </Link>
            <Link href="/privacy" className="hover:text-slate-200">
              Privacy &amp; Security
            </Link>
            <Link href="/terms" className="hover:text-slate-200">
              Terms
            </Link>
            <a
              href="tel:988"
              className="font-semibold text-[#FF7A7A] hover:text-[#ff9c9c]"
            >
              Crisis Support (988)
            </a>
          </div>
        </div>
      </footer>

      {/* 🔹 NxtGuide floating chat widget */}
      <div className="fixed bottom-4 right-4 z-40">
        {chatOpen ? (
          <div className="w-72 sm:w-80 rounded-2xl border border-slate-700 bg-[#020b16] shadow-lg shadow-black/40 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0A2239]">
              <div className="text-[11px]">
                <div className="font-semibold text-slate-50">NxtGuide</div>
                <div className="text-slate-300">
                  Trauma-informed virtual advocate
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-[11px]">
              {chatMessages.length === 0 && (
                <p className="text-slate-400">
                  You can ask me things like:
                  <br />
                  • “What is this site for?”
                  <br />
                  • “Where do I start my application?”
                  <br />
                  • “What documents will I need?”
                </p>
              )}
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${
                      m.role === "user"
                        ? "bg-[#1C8C8C] text-slate-950"
                        : "bg-slate-900 text-slate-100 border border-slate-700"
                    } text-[11px] whitespace-pre-wrap`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <p className="text-[11px] text-slate-400">
                  NxtGuide is typing…
                </p>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-slate-800 p-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask NxtGuide anything..."
                className="w-full rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1C8C8C] focus:border-[#1C8C8C]"
              />
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center rounded-full bg-[#1C8C8C] px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-black/40 hover:bg-[#21a3a3] transition"
          >
            Need help?
            <span className="ml-1 text-[10px] text-slate-900/80">
              Chat with NxtGuide
            </span>
          </button>
        )}
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
      {children}
    </span>
  );
}

function FeatureCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="h-full rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm shadow-black/30">
      <h3 className="text-sm font-semibold text-slate-50 mb-1.5">{title}</h3>
      <p className="text-[11px] text-slate-300 leading-relaxed">{body}</p>
    </div>
  );
}

function MiniCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <h3 className="text-xs font-semibold text-slate-50 mb-1">{title}</h3>
      <p className="text-[11px] text-slate-300 leading-relaxed">{body}</p>
    </div>
  );
}