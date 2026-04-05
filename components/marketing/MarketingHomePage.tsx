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
          <div
            className="pointer-events-none absolute -right-24 top-1/4 h-[400px] w-[400px] rounded-full bg-[var(--color-teal-light)] opacity-40 max-md:hidden"
            aria-hidden
          />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[3fr_2fr] lg:py-16">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-teal)]">
                {t("home.mkt.hero.eyebrow")}
              </p>
              <h1 className="mt-3 max-w-[580px] text-4xl font-bold leading-[1.15] tracking-[-0.02em] text-[var(--color-navy)] sm:text-5xl">
                {t("home.mkt.hero.headline")}
              </h1>
              <p className="marketing-serif mt-6 max-w-[520px] text-lg leading-[1.618] text-[var(--color-charcoal)] sm:text-xl">
                {t("home.mkt.hero.subhead")}
              </p>

              <div className="mt-10 grid grid-cols-1 gap-4 border-y border-[var(--color-border-light)] py-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[var(--color-border-light)]">
                <div className="px-2 text-center sm:px-4">
                  <div className="text-4xl font-bold text-[var(--color-navy)]">{t("home.mkt.hero.stat1Num")}</div>
                  <div className="mt-1 text-sm text-[var(--color-warning)] font-medium">{t("home.mkt.hero.stat1Label")}</div>
                </div>
                <div className="px-2 text-center sm:px-4">
                  <div className="text-4xl font-bold text-[var(--color-navy)]">{t("home.mkt.hero.stat2Num")}</div>
                  <div className="mt-1 text-sm text-[var(--color-warning)]">{t("home.mkt.hero.stat2Label")}</div>
                </div>
                <div className="px-2 text-center sm:px-4">
                  <div className="text-4xl font-bold text-[var(--color-navy)]">{t("home.mkt.hero.stat3Num")}</div>
                  <div className="mt-1 text-sm text-[var(--color-teal-deep)]">{t("home.mkt.hero.stat3Label")}</div>
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-[var(--color-muted)] sm:text-left">{t("home.mkt.hero.source")}</p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {loading ? (
                  <span className="text-sm text-[var(--color-muted)]">{t("common.loading")}</span>
                ) : user ? (
                  <Link
                    href={getDashboardPath(me)}
                    className="inline-flex h-[52px] min-h-[48px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-teal-deep)] px-8 text-base font-medium text-white hover:bg-[var(--color-teal)] transition-colors"
                  >
                    {t("home.hero.ctaMyDashboard")}
                  </Link>
                ) : (
                  <>
                    <Link
                      href={START_APPLICATION_HREF}
                      className="inline-flex h-[52px] min-h-[48px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-teal-deep)] px-8 text-base font-medium text-white hover:bg-[var(--color-teal)] transition-colors"
                    >
                      {t("home.mkt.hero.ctaPrimary")}
                    </Link>
                    <a
                      href="#demo"
                      className="inline-flex h-[52px] min-h-[48px] items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-[var(--color-teal)] px-8 text-base font-medium text-[var(--color-teal)] hover:bg-[var(--color-teal-light)] transition-colors"
                    >
                      {t("home.mkt.hero.ctaDemo")}
                    </a>
                  </>
                )}
              </div>
              <p className="mt-4 text-sm text-[var(--color-muted)]">{t("home.mkt.hero.ctaFootnote")}</p>
            </div>

            {/* Preview card */}
            <div className="relative flex flex-col items-center">
              <div
                className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border-light)] bg-[var(--color-warm-cream)] p-6 shadow-[var(--shadow-card)]"
                aria-hidden
              >
                <div className="space-y-3 opacity-60">
                  <div className="h-2 w-3/4 rounded-full bg-[var(--color-sage)]" />
                  <div className="h-8 rounded-md bg-[var(--color-light-sand)]" />
                  <div className="h-8 rounded-md bg-[var(--color-light-sand)]" />
                </div>
                <div className="relative -mt-16 rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-white p-4 shadow-md">
                  <p className="text-sm font-semibold text-[var(--color-navy)]">Let&apos;s check your eligibility</p>
                  <p className="mt-3 text-xs text-[var(--color-slate)]">Was this crime reported to the police?</p>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs">Yes</span>
                    <span className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs">Not yet</span>
                  </div>
                  <p className="mt-3 text-[11px] text-[var(--color-muted)]">{t("home.mkt.hero.previewStepLabel")}</p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-center text-[13px] text-[var(--color-muted)]">{t("home.mkt.hero.previewCaption")}</p>
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

        {/* Demo / video */}
        <section id="demo" className="scroll-mt-28 border-b border-[var(--color-border-light)] py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <span className="inline-block rounded-full bg-[var(--color-teal-light)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-teal)]">
              {t("home.mkt.demo.label")}
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[var(--color-navy)] sm:text-4xl">{t("home.mkt.demo.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-[var(--color-slate)]">{t("home.mkt.demo.subtitle")}</p>
            <p className="mt-2 text-sm font-medium text-[var(--color-teal-deep)]">{t("home.mkt.demo.disclaimer")}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{t("home.mkt.demo.walkthroughSoon")}</p>
          </div>
          <div className="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-6">
            <video
              className="w-full rounded-[var(--radius-xl)] border border-[var(--color-border-light)] bg-black object-contain shadow-[var(--shadow-card)] max-h-[min(70vh,520px)]"
              controls
              playsInline
              preload="metadata"
            >
              <source src="/mvp-demo.mp4" type="video/mp4" />
            </video>
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="scroll-mt-28 bg-[var(--color-navy)] py-16 text-white sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-teal-soft)]">
              {t("home.mkt.problem.label")}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">{t("home.mkt.problem.title")}</h2>
            <p className="marketing-serif mt-6 max-w-[680px] text-lg leading-[1.618] text-white/85">{t("home.mkt.problem.body")}</p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  eyebrow: t("home.mkt.problem.card1Eyebrow"),
                  stat: t("home.mkt.problem.card1Stat"),
                  desc: t("home.mkt.problem.card1Desc"),
                },
                {
                  eyebrow: t("home.mkt.problem.card2Eyebrow"),
                  stat: t("home.mkt.problem.card2Stat"),
                  desc: t("home.mkt.problem.card2Desc"),
                },
                {
                  eyebrow: t("home.mkt.problem.card3Eyebrow"),
                  stat: t("home.mkt.problem.card3Stat"),
                  desc: t("home.mkt.problem.card3Desc"),
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.06] p-6"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-white/60">{c.eyebrow}</p>
                  <p className="mt-2 text-5xl font-bold text-[var(--color-teal-soft)]">{c.stat}</p>
                  <p className="mt-3 text-[15px] leading-snug text-white/75">{c.desc}</p>
                </div>
              ))}
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

        {/* About / pilot */}
        <section id="about" className="scroll-mt-28 border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-teal)]">
              {t("home.mkt.about.label")}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--color-navy)] sm:text-4xl">{t("home.mkt.about.title")}</h2>
            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                  {t("home.mkt.about.pilotLabel")}
                </p>
                <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-teal-deep)]/15 bg-[var(--color-teal-light)] p-6">
                  <h3 className="text-xl font-bold text-[var(--color-teal-deep)]">{t("home.mkt.about.pilotName")}</h3>
                  <p className="mt-2 text-sm text-[var(--color-slate)]">{t("home.mkt.about.pilotAddr")}</p>
                  <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-charcoal)]">{t("home.mkt.about.pilotDesc")}</p>
                  <span className="mt-4 inline-block rounded-full bg-[var(--color-sage-light)] px-3 py-1 text-xs font-medium text-[var(--color-sage-deep)]">
                    {t("home.mkt.about.pilotStatus")}
                  </span>
                  <p className="mt-4 text-sm text-[var(--color-slate)]">{t("home.mkt.about.pilotTargets")}</p>
                </div>
                <p className="mt-6 text-sm text-[var(--color-slate)]">{t("home.mkt.about.pilotCtaIntro")}</p>
                <a href="#convert" className="mt-2 inline-block text-sm font-medium text-[var(--color-teal)] hover:underline">
                  {t("home.mkt.about.pilotCta")}
                </a>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[var(--color-navy)]">{t("home.mkt.about.teamHeading")}</h3>
                <p className="marketing-serif mt-4 text-lg leading-[1.618] text-[var(--color-charcoal)]">
                  {t("home.mkt.about.teamBody")}
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    [t("home.mkt.about.founder1Name"), t("home.mkt.about.founder1Role"), t("home.mkt.about.founder1Bio")],
                    [t("home.mkt.about.founder2Name"), t("home.mkt.about.founder2Role"), t("home.mkt.about.founder2Bio")],
                    [t("home.mkt.about.founder3Name"), t("home.mkt.about.founder3Role"), t("home.mkt.about.founder3Bio")],
                    [t("home.mkt.about.founder4Name"), t("home.mkt.about.founder4Role"), t("home.mkt.about.founder4Bio")],
                  ].map(([name, r, bio], i) => (
                    <li key={i} className="border-b border-[var(--color-border-light)] pb-4 last:border-0">
                      <div className="font-semibold text-[var(--color-navy)]">{name}</div>
                      <div className="text-sm text-[var(--color-teal)]">{r}</div>
                      <div className="mt-1 text-sm text-[var(--color-slate)]">{bio}</div>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-sm text-[var(--color-muted)]">{t("home.mkt.about.companyLine")}</p>
              </div>
            </div>
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
