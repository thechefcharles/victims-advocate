"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath, type DashboardMe } from "@/lib/dashboardRoutes";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { useI18n } from "@/components/i18n/i18nProvider";

export default function MarketingLandingPage() {
  const { t } = useI18n();
  const { loading, user, isAdmin, role, orgId, orgRole } = useAuth();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-20 space-y-16 sm:space-y-20">
        {/* Hero — minimal */}
        <section className="text-center space-y-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-50 text-balance">
            {t("home.hero.title")}
          </h1>
          <p className="max-w-xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            {t("home.hero.subtitle")}
          </p>
          <p className="max-w-lg mx-auto text-xs sm:text-sm text-slate-500 leading-relaxed">
            {t("home.hero.disclaimer")}
          </p>

          <div className="pt-4 flex flex-col items-center gap-4">
            {loading ? (
              <span className="text-sm text-slate-500">{t("common.loading")}</span>
            ) : user ? (
              <Link
                href={getDashboardPath(me)}
                className="inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition"
              >
                {t("home.hero.ctaMyDashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href={ROUTES.signup}
                  className="inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  {t("home.hero.ctaCreateAccount")}
                </Link>
                <p className="text-sm text-slate-500">
                  {t("home.hero.signInPrompt")}{" "}
                  <Link href={ROUTES.login} className="text-teal-400/90 hover:text-teal-300 font-medium">
                    {t("nav.login")}
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>

        {/* Video */}
        <section id="demo" className="space-y-4 scroll-mt-24">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">{t("home.hero.videoTitle")}</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{t("home.hero.demoVideoIntro")}</p>
          </div>
          <div className="w-full max-w-2xl mx-auto">
            <video
              className="w-full rounded-2xl border border-slate-800 shadow-xl"
              controls
              preload="metadata"
            >
              <source src="/mvp-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </section>

        {/* Newsletter */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 sm:p-8 max-w-xl mx-auto">
          <h2 className="text-base font-semibold text-slate-300 mb-1">{t("home.newsletter.title")}</h2>
          <p className="text-sm text-slate-500 mb-4">{t("home.newsletter.description")}</p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder={t("home.newsletter.placeholder")}
              required
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={newsletterStatus === "loading"}
            />
            <button
              type="submit"
              disabled={newsletterStatus === "loading"}
              className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60 disabled:opacity-50 transition"
            >
              {newsletterStatus === "loading"
                ? t("home.newsletter.submitting")
                : newsletterStatus === "success"
                  ? t("home.newsletter.subscribed")
                  : t("home.newsletter.submit")}
            </button>
          </form>
          {newsletterStatus === "success" && (
            <p className="mt-2 text-sm text-emerald-400">{t("home.newsletter.thanks")}</p>
          )}
          {newsletterStatus === "error" && (
            <p className="mt-2 text-sm text-red-400">{t("home.newsletter.error")}</p>
          )}
        </section>
      </div>

      <footer className="border-t border-slate-800 bg-slate-950 mt-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NxtStps. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/help" className="hover:text-slate-200">
              Help
            </Link>
            <Link href="/privacy" className="hover:text-slate-200">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-200">
              Terms
            </Link>
            <Link href="/waiver" className="hover:text-slate-200">
              Liability Waiver
            </Link>
            <a
              href="tel:988"
              className="font-semibold text-[#FF7A7A] hover:text-[#ff9c9c]"
            >
              988 Suicide &amp; Crisis Lifeline
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
