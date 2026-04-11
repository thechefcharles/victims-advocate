"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BarChart2,
  Building2,
  Calendar,
  CheckCircle2,
  Heart,
  Lock,
  MapPin,
  Shield,
  Users,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath, type DashboardMe } from "@/lib/dashboardRoutes";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { useI18n } from "@/components/i18n/i18nProvider";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingHomeInteractiveDemo } from "@/components/marketing/MarketingHomeInteractiveDemo";
import { MarketingHomeAudiences } from "@/components/marketing/MarketingHomeAudiences";
import { MarketingDemoVideo } from "@/components/marketing/MarketingDemoVideo";

const SCHEDULE_URL = process.env.NEXT_PUBLIC_MEETING_URL ?? "";

/**
 * Primary survivor path: guided intake can be started without an account.
 * Account creation remains available via signup from hero when needed.
 */
const START_APPLICATION_HREF = ROUTES.compensationIntake;

export function MarketingHomePage() {
  const { t, tf, lang } = useI18n();
  const { loading, user, isAdmin, role, orgId, orgRole } = useAuth();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [demoName, setDemoName] = useState("");
  const [demoOrg, setDemoOrg] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoRole, setDemoRole] = useState("");
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const me: DashboardMe = { isAdmin, role, orgId, orgRole };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) return;
    setNewsletterStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" }),
      });
      if (res.ok) {
        setNewsletterStatus("success");
        setNewsletterEmail("");
      } else {
        setNewsletterStatus("error");
      }
    } catch {
      setNewsletterStatus("error");
    }
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("Demo request — NxtStps");
    const body = encodeURIComponent(
      `Name: ${demoName}\nOrganization: ${demoOrg}\nEmail: ${demoEmail}\nRole: ${demoRole}\n`
    );
    window.location.href = `mailto:contact@nxtstps.org?subject=${subject}&body=${body}`;
    setDemoSubmitted(true);
  };

  const trustItems = [
    { icon: Shield, text: t("home.mkt.trust.voca") },
    { icon: CheckCircle2, text: t("home.mkt.trust.compliance") },
    { icon: Building2, text: t("home.mkt.trust.pilot") },
    { icon: Heart, text: t("home.mkt.trust.trauma") },
    { icon: Lock, text: t("home.mkt.trust.encryption") },
  ] as const;

  const year = new Date().getFullYear();

  return (
    <div className="marketing-home-root min-h-screen pb-24 md:pb-0">
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-[var(--color-border-light)] scroll-mt-24">
          <div className="pointer-events-none absolute -right-24 top-1/4 h-[400px] w-[400px] rounded-full bg-[var(--color-teal-light)] opacity-30 max-md:hidden" aria-hidden />

          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[3fr_2fr] lg:py-20">
            {/* Left — headline + CTAs */}
            <div>
              <p className="text-sm font-medium text-[var(--color-teal)]">NxtStps is here to help.</p>
              <h1 className="mt-4 max-w-[540px] text-5xl font-bold leading-[1.1] tracking-[-0.025em] text-[var(--color-navy)] sm:text-6xl">
                Taking the next step shouldn&apos;t be the hardest one.
              </h1>
              <p className="mt-6 max-w-[480px] text-lg leading-relaxed text-[var(--color-slate)]">
                NxtStps is an operating system for victim services — helping applicants access compensation,
                advocates manage cases, and organizations deliver support more effectively.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={user ? "/compensation/eligibility" : "/signup?intent=applicant"}
                  className="inline-flex h-[52px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-teal-deep)] px-8 text-base font-medium text-white hover:bg-[var(--color-teal)] transition-colors"
                >
                  Apply now
                </Link>
              </div>
              <p className="mt-3 text-[13px] text-[var(--color-muted)]">Free for applicants. No account required to explore.</p>
            </div>

            {/* Right — What is NxtStps card */}
            <div className="flex flex-col justify-center">
              <div className="w-full rounded-2xl border border-[var(--color-border-light)] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-teal)]">One platform, three audiences</p>
                <div className="mt-5 space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-teal-light)]">
                      <Heart className="h-4 w-4 text-[var(--color-teal-deep)]" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy)]">Applicants</p>
                      <p className="mt-0.5 text-[13px] text-[var(--color-slate)]">Find services, file for compensation, track your case — guided and multilingual.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-teal-light)]">
                      <Users className="h-4 w-4 text-[var(--color-teal-deep)]" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy)]">Providers &amp; Advocates</p>
                      <p className="mt-0.5 text-[13px] text-[var(--color-slate)]">Manage cases, referrals, scheduling, and reporting in one workspace.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-teal-light)]">
                      <Building2 className="h-4 w-4 text-[var(--color-teal-deep)]" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy)]">Agencies</p>
                      <p className="mt-0.5 text-[13px] text-[var(--color-slate)]">Oversight analytics, compliance monitoring, and provider performance — no casework access.</p>
                    </div>
                  </div>
                </div>
              </div>
              <a
                href="#convert"
                className="mt-4 inline-flex w-full items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-[var(--color-teal)] px-6 py-3 text-sm font-medium text-[var(--color-teal)] hover:bg-[var(--color-teal-light)] transition-colors"
              >
                Request a demo →
              </a>
            </div>
          </div>

          {/* Full-width stat band */}
          <div className="border-t border-[var(--color-border-light)] bg-[var(--color-surface)]/50">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2">
              {/* 1 in 16 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-teal)]">Chicago, 2018–2023</p>
                <div className="mt-2 text-6xl font-bold text-[var(--color-warning)] sm:text-7xl">1 in 16</div>
                <p className="mt-2 text-lg text-[var(--color-charcoal)]">victims of violent crime applied for compensation</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-slate)]">
                  Over <strong className="text-[var(--color-charcoal)]">179,000</strong> direct victims.
                  Only <strong className="text-[var(--color-charcoal)]">11,000</strong> applied.
                  The money exists — the process is the barrier.
                </p>
                <p className="mt-3 text-[11px] text-[var(--color-muted)]">
                  Source: Chavis &amp; Nass, <em>The Trace</em>, 2021. FOIA analysis of IL Attorney General data.
                </p>
              </div>
              {/* 3 stats */}
              <div className="grid grid-cols-3 gap-0 divide-x divide-[var(--color-border-light)] self-center">
                <div className="px-3 text-center">
                  <div className="text-3xl font-bold text-[var(--color-warning)] sm:text-4xl">63%</div>
                  <div className="mt-1 text-xs text-[var(--color-slate)]">of claims denied</div>
                </div>
                <div className="px-3 text-center">
                  <div className="text-3xl font-bold text-[var(--color-warning)] sm:text-4xl">281</div>
                  <div className="mt-1 text-xs text-[var(--color-slate)]">days median wait</div>
                </div>
                <div className="px-3 text-center">
                  <div className="text-3xl font-bold text-[var(--color-teal-deep)] sm:text-4xl">3,677</div>
                  <div className="mt-1 text-xs text-[var(--color-slate)]">IL claims per year</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-b border-[var(--color-teal-deep)]/20 bg-[var(--color-teal-deep)] py-4 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-white/30">
              {trustItems.map(({ icon: Icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 lg:justify-center lg:first:pl-0 lg:last:pr-0"
                >
                  <Icon className="h-5 w-5 shrink-0 opacity-95" strokeWidth={1.75} aria-hidden />
                  <span className="text-[13px] font-medium leading-snug">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MarketingHomeInteractiveDemo />

        {/* Video tour (secondary to interactive demo) */}
        <section id="demo-video" className="scroll-mt-28 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]/40 py-[var(--space-7)] sm:py-[var(--space-8)]">
          <div className="mx-auto max-w-3xl px-[var(--space-4)] text-center sm:px-[var(--space-6)]">
            <h2 className="text-2xl font-bold text-[var(--color-navy)] sm:text-3xl">{t("home.mkt.videoTour.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-[var(--color-slate)]">{t("home.mkt.videoTour.intro")}</p>
          </div>
          <MarketingDemoVideo />
        </section>

        {/* Problem — dark band uses teal-deep (primary brand), not navy background (Brand Kit: navy for text) */}
        <section id="problem" className="scroll-mt-28 bg-[var(--color-teal-deep)] py-16 text-white sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-teal-soft)]">
              {t("home.mkt.problem.label")}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">{t("home.mkt.problem.title")}</h2>
            <p className="marketing-serif mt-6 max-w-[680px] text-lg leading-[1.618] text-white/85">{t("home.mkt.problem.body")}</p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {/* Card 1: 63% denied */}
              <div className="rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.06] p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-white/60">{t("home.mkt.problem.card1Eyebrow")}</p>
                <p className="mt-2 text-5xl font-bold text-[var(--color-gold-light)]">{t("home.mkt.problem.card1Stat")}</p>
                <p className="mt-3 text-[15px] leading-snug text-white/75">{t("home.mkt.problem.card1Desc")}</p>
              </div>

              {/* Card 2: 281 days */}
              <div className="rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.06] p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-white/60">{t("home.mkt.problem.card2Eyebrow")}</p>
                <p className="mt-2 text-5xl font-bold text-[var(--color-gold-light)]">{t("home.mkt.problem.card2Stat")}</p>
                <p className="mt-3 text-[15px] leading-snug text-white/75">{t("home.mkt.problem.card2Desc")}</p>
              </div>

              {/* Card 3: Bar chart — awards by crime type (replaces $125K audit) */}
              <div className="rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.06] p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-white/60">The Trace · FOIA analysis</p>
                <h3 className="mt-2 text-lg font-bold text-white">Awards Depend on the Crime</h3>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Murder", denial: 14, awardNoPay: 23, award: 63 },
                    { label: "Assault & battery", denial: 29, awardNoPay: 38, award: 33 },
                    { label: "Sex offenses", denial: 21, awardNoPay: 60, award: 19 },
                  ].map((row) => (
                    <div key={row.label}>
                      <span className="text-[11px] font-medium text-white/70">{row.label}</span>
                      <div className="mt-1 flex h-6 w-full overflow-hidden rounded">
                        <div className="flex items-center justify-center text-[10px] font-bold text-white bg-[#3B7DD8]" style={{ width: `${row.award}%` }}>{row.award}%</div>
                        <div className="flex items-center justify-center text-[10px] font-bold text-[#1a1a2e] bg-[#D4A853]" style={{ width: `${row.awardNoPay}%` }}>{row.awardNoPay}%</div>
                        <div className="flex items-center justify-center text-[10px] font-bold text-[#1a1a2e] bg-[#E8D5B0]" style={{ width: `${row.denial}%` }}>{row.denial}%</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/50">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[#3B7DD8]" /> Award</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[#D4A853]" /> Award–no pay</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[#E8D5B0]" /> Denial</span>
                </div>
              </div>
            </div>
            <p className="mt-10 text-center text-xs text-white/45">{t("home.mkt.problem.sources")}</p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-28 border-b border-[var(--color-border-light)] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-teal)]">
              {t("home.mkt.how.label")}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--color-navy)] sm:text-4xl">{t("home.mkt.how.title")}</h2>

            <ol className="mt-12 space-y-10 md:space-y-0">
              {[
                { title: t("home.mkt.how.step1Title"), body: t("home.mkt.how.step1Body"), icon: MapPin },
                { title: t("home.mkt.how.step2Title"), body: t("home.mkt.how.step2Body"), icon: Users },
                { title: t("home.mkt.how.step3Title"), body: t("home.mkt.how.step3Body"), icon: FileText },
                { title: t("home.mkt.how.step4Title"), body: t("home.mkt.how.step4Body"), icon: ShieldCheck },
                { title: t("home.mkt.how.step5Title"), body: t("home.mkt.how.step5Body"), icon: CheckCircle2 },
              ].map((step, idx) => (
                <li key={idx} className="flex gap-4 md:grid md:grid-cols-[auto_1fr] md:gap-8">
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-teal-light)] text-sm font-bold text-[var(--color-teal-deep)]">
                      {idx + 1}
                    </div>
                    {idx < 4 && (
                      <div
                        className="my-2 w-px flex-1 bg-[var(--color-border)] md:hidden min-h-[24px]"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="pb-2 md:border-l-2 md:border-dashed md:border-[var(--color-border)] md:pl-8">
                    <step.icon className="h-6 w-6 text-[var(--color-teal)]" strokeWidth={1.75} aria-hidden />
                    <h3 className="mt-2 text-lg font-semibold text-[var(--color-navy)]">{step.title}</h3>
                    <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--color-slate)]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <MarketingHomeAudiences />

        {/* Denial prevention */}
        <section
          id="denial-prevention"
          className="scroll-mt-28 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] py-[var(--space-7)] sm:py-[var(--space-8)]"
        >
          <div className="mx-auto max-w-6xl px-[var(--space-4)] sm:px-[var(--space-6)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-teal)]">
              {t("home.mkt.denial.label")}
            </p>
            <h2 className="mt-3 max-w-3xl text-[28px] font-bold leading-tight text-[var(--color-navy)] sm:text-4xl">
              {t("home.mkt.denial.title")}
            </h2>
            <p className="mt-4 max-w-[680px] text-lg text-[var(--color-slate)]">{t("home.mkt.denial.body")}</p>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["d1Reason", "d1Fix", "d1Tag"],
                  ["d2Reason", "d2Fix", "d2Tag"],
                  ["d3Reason", "d3Fix", "d3Tag"],
                  ["d4Reason", "d4Fix", "d4Tag"],
                  ["d5Reason", "d5Fix", "d5Tag"],
                  ["d6Reason", "d6Fix", "d6Tag"],
                ] as const
              ).map(([rk, fk, tk], idx) => (
                <div
                  key={idx}
                  className="relative rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-white p-[var(--space-5)] pl-6 shadow-[var(--shadow-subtle)]"
                >
                  <span
                    className="absolute left-0 top-0 h-full w-1 rounded-l-[var(--radius-lg)] bg-[var(--color-teal-deep)]"
                    aria-hidden
                  />
                  <p className="text-[13px] font-medium text-[var(--color-slate)]">{t(`home.mkt.denial.${rk}`)}</p>
                  <p className="mt-2 text-base font-semibold text-[var(--color-navy)]">{t(`home.mkt.denial.${fk}`)}</p>
                  <span className="mt-3 inline-block rounded-[var(--radius-pill)] bg-[var(--color-sage-light)] px-3 py-1 text-xs font-medium text-[var(--color-sage-deep)]">
                    {t(`home.mkt.denial.${tk}`)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-[var(--color-teal)]">
              <Link href={ROUTES.help} className="font-medium underline underline-offset-2 hover:text-[var(--color-teal-deep)]">
                {t("home.mkt.denial.docHint")}
              </Link>
            </p>
          </div>
        </section>

        {/* Conversion */}
        <section id="convert" className="scroll-mt-28 bg-[var(--color-teal-deep)] py-16 text-white sm:py-24">
          <div id="for-advocates" className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl">{t("home.mkt.convert.title")}</h2>
            <p className="mt-3 max-w-2xl text-lg text-white/85">{t("home.mkt.convert.subtitle")}</p>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.08] p-6">
                <ArrowRight className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{t("home.mkt.convert.survivorsTitle")}</h3>
                <p className="mt-2 text-sm text-white/80">{t("home.mkt.convert.survivorsBody")}</p>
                <Link
                  href={START_APPLICATION_HREF}
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-[var(--radius-sm)] bg-white text-base font-semibold text-[var(--color-teal-deep)] hover:bg-[var(--color-teal-light)] transition-colors"
                >
                  {t("home.mkt.convert.survivorsCta")}
                </Link>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.08] p-6">
                <Calendar className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{t("home.mkt.convert.demoTitle")}</h3>
                <p className="mt-2 text-sm text-white/80">{t("home.mkt.convert.demoBody")}</p>
                {demoSubmitted ? (
                  <p className="mt-6 text-sm font-medium text-[var(--color-sage-light)]">{t("home.mkt.convert.demoThanks")}</p>
                ) : (
                  <form onSubmit={handleDemoSubmit} className="mt-6 space-y-3">
                    <div>
                      <label className="block text-[13px] font-medium text-white">{t("home.mkt.convert.demoName")}</label>
                      <input
                        required
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                        className="mt-1 w-full rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-[var(--color-teal-soft)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-white">{t("home.mkt.convert.demoOrg")}</label>
                      <input
                        required
                        value={demoOrg}
                        onChange={(e) => setDemoOrg(e.target.value)}
                        className="mt-1 w-full rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-[var(--color-teal-soft)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-white">{t("home.mkt.convert.demoEmail")}</label>
                      <input
                        type="email"
                        required
                        value={demoEmail}
                        onChange={(e) => setDemoEmail(e.target.value)}
                        className="mt-1 w-full rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-[var(--color-teal-soft)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-white">{t("home.mkt.convert.demoRole")}</label>
                      <select
                        required
                        value={demoRole}
                        onChange={(e) => setDemoRole(e.target.value)}
                        className="mt-1 w-full rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white focus:border-[var(--color-teal-soft)] focus:outline-none"
                      >
                        <option value="">{langPlaceholder(lang)}</option>
                        <option value="advocate">{t("home.mkt.convert.demoRoleAdvocate")}</option>
                        <option value="cbo">{t("home.mkt.convert.demoRoleCbo")}</option>
                        <option value="hospital">{t("home.mkt.convert.demoRoleHospital")}</option>
                        <option value="le">{t("home.mkt.convert.demoRoleLe")}</option>
                        <option value="other">{t("home.mkt.convert.demoRoleOther")}</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="flex h-12 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-gold)] text-base font-semibold text-[var(--color-navy)] hover:brightness-105 transition-[filter]"
                    >
                      {t("home.mkt.convert.demoSubmit")}
                    </button>
                  </form>
                )}
              </div>

              <div className="rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.08] p-6">
                <BarChart2 className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{t("home.mkt.convert.investorsTitle")}</h3>
                <p className="mt-2 text-sm text-white/80">{t("home.mkt.convert.investorsBody")}</p>
                {SCHEDULE_URL ? (
                  <a
                    href={SCHEDULE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-white text-base font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    {t("home.mkt.convert.scheduleCta")}
                  </a>
                ) : (
                  <a
                    href="mailto:contact@nxtstps.org?subject=Schedule%20a%20conversation"
                    className="mt-6 flex h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-white text-base font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    {t("home.mkt.convert.scheduleCta")}
                  </a>
                )}
                <p className="mt-4 text-center text-sm text-white/65">
                  <a href="mailto:contact@nxtstps.org" className="underline underline-offset-2 hover:text-white">
                    {t("home.mkt.convert.emailLine")}
                  </a>
                </p>
                <p className="mt-2 text-center text-[13px] font-medium text-white/85">{t("home.mkt.convert.seedLine")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="mx-auto max-w-xl px-4 py-14 sm:px-6">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/40 p-6 sm:p-8">
            <h2 className="text-base font-semibold text-[var(--color-navy)]">{t("home.newsletter.title")}</h2>
            <p className="mt-1 text-sm text-[var(--color-slate)]">{t("home.newsletter.description")}</p>
            <form onSubmit={handleNewsletterSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={t("home.newsletter.placeholder")}
                required
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-4 py-2.5 text-sm text-[var(--color-charcoal)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
                disabled={newsletterStatus === "loading"}
              />
              <button
                type="submit"
                disabled={newsletterStatus === "loading"}
                className="rounded-lg border border-[var(--color-teal-deep)] bg-[var(--color-teal-deep)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
              >
                {newsletterStatus === "loading"
                  ? t("home.newsletter.submitting")
                  : newsletterStatus === "success"
                    ? t("home.newsletter.subscribed")
                    : t("home.newsletter.submit")}
              </button>
            </form>
            {newsletterStatus === "success" && (
              <p className="mt-2 text-sm text-[var(--color-success)]">{t("home.newsletter.thanks")}</p>
            )}
            {newsletterStatus === "error" && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{t("home.newsletter.error")}</p>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-[var(--color-navy)] pb-28 text-white md:pb-16">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-lg font-semibold">{t("home.mkt.nav.wordmark")}</div>
                <p className="mt-2 text-sm text-white/65">{t("home.mkt.footerMkt.tagline")}</p>
                <p className="mt-4 text-xs text-white/45">{t("home.mkt.footerMkt.pilotLine")}</p>
                <p className="mt-2 text-xs text-white/45">{t("home.mkt.footerMkt.expanding")}</p>
              </div>
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-white/50">
                  {t("home.mkt.footerMkt.colPlatform")}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a href="#how-it-works" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkHow")}
                    </a>
                  </li>
                  <li>
                    <Link href={START_APPLICATION_HREF} className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkSurvivors")}
                    </Link>
                  </li>
                  <li>
                    <a href="#for-advocates" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkAdvocates")}
                    </a>
                  </li>
                  <li>
                    <a href="#convert" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkOrgs")}
                    </a>
                  </li>
                  <li>
                    <a href="#convert" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkDemo")}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-white/50">
                  {t("home.mkt.footerMkt.colLegal")}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link href="/terms" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkTerms")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkPrivacy")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/data-deletion" className="text-white/90 hover:underline">
                      Data Deletion Policy
                    </Link>
                  </li>
                  <li>
                    <Link href={ROUTES.help} className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkHelp")}
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-white/50">
                  {t("home.mkt.footerMkt.colSupport")}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <a href="mailto:contact@nxtstps.org" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkContact")}
                    </a>
                  </li>
                  <li>
                    <a href="#convert" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkPilot")}
                    </a>
                  </li>
                  <li>
                    <a href="#about" className="text-white/90 hover:underline">
                      {t("home.mkt.footerMkt.linkAbout")}
                    </a>
                  </li>
                </ul>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="text-[13px] font-medium text-white/65">{t("home.mkt.footerMkt.crisisIf")}</p>
                  <p className="mt-2 text-sm">
                    <a href="tel:988" className="block hover:underline">
                      {t("home.mkt.footerMkt.crisis988")}
                    </a>
                    <span className="mt-1 block">{t("home.mkt.footerMkt.crisisText")}</span>
                    <a href="tel:911" className="mt-1 block hover:underline">
                      {t("home.mkt.footerMkt.crisis911")}
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-10 border-t border-white/10 pt-6">
              <div className="flex flex-col gap-3 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
                <p>{tf("home.mkt.footerMkt.bottomCopy", { year })}</p>
                <p>{t("home.mkt.footerMkt.bottomChips")}</p>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile sticky crisis strip */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[200] border-t border-[var(--color-border-light)] bg-[var(--color-light-sand)] px-4 py-2 text-center text-xs text-[var(--color-slate)] md:hidden"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {t("home.mkt.stickyCrisis")}
      </div>
    </div>
  );
}

function langPlaceholder(lang: string) {
  return lang === "es" ? "Selecciona…" : "Select…";
}
