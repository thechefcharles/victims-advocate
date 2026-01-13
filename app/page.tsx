// app/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import AuthPanel from "@/components/AuthPanel";
import { useI18n } from "@/components/i18n/i18nProvider";

const audienceKeys = [
  "victims",
  "advocates",
  "caseManagers",
  "communityOrgs",
  "hospitals",
  "government",
] as const;

type AudienceKey = (typeof audienceKeys)[number];

export default function HomePage() {
  const { t } = useI18n();

  const [activeAudience, setActiveAudience] = useState<AudienceKey>("victims");

  // NxtGuide chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chatLoading) return;

    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const newMessages = [...chatMessages, { role: "user" as const, content: trimmed }];

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
          { role: "assistant", content: t("nxtGuide.errors.respondFailed") },
        ]);
        return;
      }

      const json = await res.json();
      const reply = (json.reply as string) || "";

      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("NxtGuide error:", err);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("nxtGuide.errors.technicalProblem") },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 space-y-16">
        {/* HERO */}
        <section className="grid gap-10 md:grid-cols-[3fr,2fr] items-center">
          <div className="space-y-5">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-50">
              {t("home.hero.title")}
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-slate-200">
              {t("home.hero.subtitle")}
            </p>

            <AuthPanel />

            <p className="text-[11px] text-slate-500 max-w-md">
              {t("home.hero.disclaimer")}
            </p>
          </div>

          {/* Right-hand preview card */}
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-tr from-[#1C8C8C]/10 via-[#F2C94C]/5 to-transparent blur-3xl opacity-80 pointer-events-none" />
            <div className="relative rounded-3xl border border-slate-700 bg-gradient-to-b from-[#0A2239] to-[#020b16] p-5 shadow-lg shadow-black/40 space-y-4">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-medium uppercase tracking-[0.18em]">
                  {t("home.guidedPath.title")}
                </span>
                <span className="rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-slate-400">
                  {t("home.guidedPath.badge")}
                </span>
              </div>

              <ol className="space-y-2 text-xs">
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1C8C8C] text-[10px] font-bold text-slate-950">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">
                      {t("home.guidedPath.step1.title")}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t("home.guidedPath.step1.body")}
                    </p>
                  </div>
                </li>

                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F2C94C] text-[10px] font-bold text-slate-950">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">
                      {t("home.guidedPath.step2.title")}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t("home.guidedPath.step2.body")}
                    </p>
                  </div>
                </li>

                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-200">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">
                      {t("home.guidedPath.step3.title")}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t("home.guidedPath.step3.body")}
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-4 rounded-2xl bg-slate-900/70 p-3 text-[11px] text-slate-300">
                {t("home.guidedPath.quote")}
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em]">
            {t("home.trustBar.title")}
          </p>
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
            <Badge>{t("home.trustBar.badge1")}</Badge>
            <Badge>{t("home.trustBar.badge2")}</Badge>
            <Badge>{t("home.trustBar.badge3")}</Badge>
            <Badge>{t("home.trustBar.badge4")}</Badge>
          </div>
        </section>

        {/* WHAT NXTSTPS HELPS WITH */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
              {t("home.features.title")}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <FeatureCard title={t("home.features.f1.title")} body={t("home.features.f1.body")} />
            <FeatureCard title={t("home.features.f2.title")} body={t("home.features.f2.body")} />
            <FeatureCard title={t("home.features.f3.title")} body={t("home.features.f3.body")} />
            <FeatureCard title={t("home.features.f4.title")} body={t("home.features.f4.body")} />
            <FeatureCard title={t("home.features.f5.title")} body={t("home.features.f5.body")} />
            <FeatureCard title={t("home.features.f6.title")} body={t("home.features.f6.body")} />
          </div>
        </section>

        {/* WHO THIS TOOL IS FOR */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-50">
            {t("home.audience.title")}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            {t("home.audience.subtitle")}
          </p>

          <div className="flex flex-wrap gap-2 text-[11px]">
            {audienceKeys.map((key) => {
              const label = t(`home.audience.tabs.${key}`);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveAudience(key)}
                  className={`rounded-full border px-3 py-1.5 transition ${
                    activeAudience === key
                      ? "border-[#1C8C8C] bg-[#1C8C8C]/15 text-[#F7F1E5]"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-[#1C8C8C]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 text-xs sm:text-sm text-slate-200">
            <ul className="space-y-1.5">
              <li>• {t(`home.audience.bullets.${activeAudience}.b1`)}</li>
              <li>• {t(`home.audience.bullets.${activeAudience}.b2`)}</li>
              <li>• {t(`home.audience.bullets.${activeAudience}.b3`)}</li>
            </ul>
          </div>
        </section>

        {/* TRANSPARENCY */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-3">
          <p className="text-sm sm:text-base font-semibold text-slate-50">
            {t("home.transparency.title")}
          </p>
          <p className="text-xs sm:text-sm text-slate-300">
            {t("home.transparency.body")}
          </p>
          <ul className="grid gap-2 text-[11px] text-slate-300 sm:grid-cols-2">
            <li>• {t("home.transparency.b1")}</li>
            <li>• {t("home.transparency.b2")}</li>
            <li>• {t("home.transparency.b3")}</li>
            <li>• {t("home.transparency.b4")}</li>
          </ul>
        </section>

        {/* STATE + PRIVACY */}
        <section className="grid gap-6 md:grid-cols-[2fr,3fr] items-start">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-slate-50">
              {t("home.state.title")}
            </h3>
            <p className="text-slate-300">{t("home.state.body")}</p>

            <label className="block space-y-1 text-[11px] text-slate-200">
              <span>{t("home.state.selectLabel")}</span>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-50"
                defaultValue="IL"
              >
                <option value="IL">{t("home.state.optionIL")}</option>
                <option disabled>{t("home.state.optionComingSoon")}</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-slate-50">
              {t("home.privacy.title")}
            </h3>
            <ul className="space-y-1.5 text-slate-300">
              <li>• {t("home.privacy.b1")}</li>
              <li>• {t("home.privacy.b2")}</li>
              <li>• {t("home.privacy.b3")}</li>
              <li>• {t("home.privacy.b4")}</li>
            </ul>
          </div>
        </section>

        {/* MULTILINGUAL */}
        <section className="rounded-2xl border border-[#1C8C8C]/40 bg-[#1C8C8C]/10 px-4 py-3 text-[11px] text-slate-50 flex flex-wrap items-center justify-between gap-2">
          <p>
            <span className="font-semibold">{t("home.multilingual.bold")}</span>{" "}
            {t("home.multilingual.body")}
          </p>
          <span className="rounded-full bg-slate-900/60 px-3 py-1 text-[10px] text-slate-300">
            {t("home.multilingual.badge")}
          </span>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-[#020813] mt-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>
              © {new Date().getFullYear()} {t("home.footer.rights")}
            </p>
            <p className="max-w-md">{t("home.footer.disclaimer")}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/knowledge/compensation" className="hover:text-slate-200">
              {t("home.footer.links.resourceLibrary")}
            </Link>
            <Link href="/compensation" className="hover:text-slate-200">
              {t("home.footer.links.forVictims")}
            </Link>
            <Link href="/dashboard" className="hover:text-slate-200">
              {t("nav.dashboardVictim")}
            </Link>
            <Link href="/privacy" className="hover:text-slate-200">
              {t("home.footer.links.privacySecurity")}
            </Link>
            <Link href="/terms" className="hover:text-slate-200">
              {t("home.footer.links.terms")}
            </Link>
            <a
              href="tel:988"
              className="font-semibold text-[#FF7A7A] hover:text-[#ff9c9c]"
            >
              {t("home.footer.links.crisis988")}
            </a>
          </div>
        </div>
      </footer>

      {/* NxtGuide widget */}
      <div className="fixed bottom-4 right-4 z-40">
        {chatOpen ? (
          <div className="w-72 sm:w-80 rounded-2xl border border-slate-700 bg-[#020b16] shadow-lg shadow-black/40 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0A2239]">
              <div className="text-[11px]">
                <div className="font-semibold text-slate-50">{t("nxtGuide.title")}</div>
                <div className="text-slate-300">{t("nxtGuide.subtitle")}</div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
                aria-label={t("nxtGuide.close")}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-[11px]">
              {chatMessages.length === 0 && (
                <p className="text-slate-400">
                  {t("nxtGuide.empty.title")}
                  <br />
                  • {t("nxtGuide.empty.q1")}
                  <br />
                  • {t("nxtGuide.empty.q2")}
                  <br />
                  • {t("nxtGuide.empty.q3")}
                </p>
              )}

              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
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
                <p className="text-[11px] text-slate-400">{t("nxtGuide.typing")}</p>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-slate-800 p-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                placeholder={chatLoading ? t("nxtGuide.placeholders.thinking") : t("nxtGuide.placeholders.ask")}
                className="w-full rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1C8C8C] focus:border-[#1C8C8C] disabled:opacity-60"
              />
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center rounded-full bg-[#1C8C8C] px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-black/40 hover:bg-[#21a3a3] transition"
          >
            {t("nxtGuide.cta.needHelp")}
            <span className="ml-1 text-[10px] text-slate-900/80">
              {t("nxtGuide.cta.chatWith")}
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

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="h-full rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm shadow-black/30">
      <h3 className="text-sm font-semibold text-slate-50 mb-1.5">{title}</h3>
      <p className="text-[11px] text-slate-300 leading-relaxed">{body}</p>
    </div>
  );
}