"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/components/i18n/i18nProvider";
import { ROUTES } from "@/lib/routes/pageRegistry";

type TabId = "survivors" | "advocates" | "cbos" | "hospitals" | "state";

const TABS: { id: TabId; labelKey: string }[] = [
  { id: "survivors", labelKey: "home.mkt.audiences.tabSurvivors" },
  { id: "advocates", labelKey: "home.mkt.audiences.tabAdvocates" },
  { id: "cbos", labelKey: "home.mkt.audiences.tabCbos" },
  { id: "hospitals", labelKey: "home.mkt.audiences.tabHospitals" },
  { id: "state", labelKey: "home.mkt.audiences.tabState" },
];

export function MarketingHomeAudiences() {
  const { t } = useI18n();
  const baseId = useId();
  const [tab, setTab] = useState<TabId>("survivors");

  const content = {
    survivors: {
      title: t("home.mkt.audiences.survivorsTitle"),
      body: t("home.mkt.audiences.survivorsBody"),
      cta: t("home.mkt.audiences.survivorsCta"),
      href: ROUTES.compensationIntake,
      bullets: [
        t("home.mkt.audiences.survivorsB1"),
        t("home.mkt.audiences.survivorsB2"),
        t("home.mkt.audiences.survivorsB3"),
        t("home.mkt.audiences.survivorsB4"),
        t("home.mkt.audiences.survivorsB5"),
        t("home.mkt.audiences.survivorsB6"),
      ],
    },
    advocates: {
      title: t("home.mkt.audiences.advocatesTitle"),
      body: t("home.mkt.audiences.advocatesBody"),
      cta: t("home.mkt.audiences.advocatesCta"),
      href: "#convert",
      bullets: [
        t("home.mkt.audiences.advocatesB1"),
        t("home.mkt.audiences.advocatesB2"),
        t("home.mkt.audiences.advocatesB3"),
        t("home.mkt.audiences.advocatesB4"),
        t("home.mkt.audiences.advocatesB5"),
        t("home.mkt.audiences.advocatesB6"),
      ],
    },
    cbos: {
      title: t("home.mkt.audiences.cbosTitle"),
      body: t("home.mkt.audiences.cbosBody"),
      cta: t("home.mkt.audiences.cbosCta"),
      href: "#convert",
      bullets: [
        t("home.mkt.audiences.cbosB1"),
        t("home.mkt.audiences.cbosB2"),
        t("home.mkt.audiences.cbosB3"),
        t("home.mkt.audiences.cbosB4"),
        t("home.mkt.audiences.cbosB5"),
        t("home.mkt.audiences.cbosB6"),
      ],
    },
    hospitals: {
      title: t("home.mkt.audiences.hospitalsTitle"),
      body: t("home.mkt.audiences.hospitalsBody"),
      cta: t("home.mkt.audiences.hospitalsCta"),
      href: "#convert",
      bullets: [
        t("home.mkt.audiences.hospitalsB1"),
        t("home.mkt.audiences.hospitalsB2"),
        t("home.mkt.audiences.hospitalsB3"),
        t("home.mkt.audiences.hospitalsB4"),
        t("home.mkt.audiences.hospitalsB5"),
        t("home.mkt.audiences.hospitalsB6"),
      ],
    },
    state: {
      title: t("home.mkt.audiences.stateTitle"),
      body: t("home.mkt.audiences.stateBody"),
      cta: t("home.mkt.audiences.stateCta"),
      href: "#convert",
      bullets: [
        t("home.mkt.audiences.stateB1"),
        t("home.mkt.audiences.stateB2"),
        t("home.mkt.audiences.stateB3"),
        t("home.mkt.audiences.stateB4"),
        t("home.mkt.audiences.stateB5"),
        t("home.mkt.audiences.stateB6"),
      ],
    },
  }[tab];

  return (
    <section id="who-its-for" className="scroll-mt-28 border-b border-[var(--color-border-light)] bg-[var(--color-bg)] py-[var(--space-7)] sm:py-[var(--space-8)]">
      <div className="mx-auto max-w-6xl px-[var(--space-4)] sm:px-[var(--space-6)]">
        <h2 className="text-[28px] font-bold leading-tight text-[var(--color-navy)] sm:text-4xl">
          {t("home.mkt.audiences.title")}
        </h2>

        <div
          role="tablist"
          aria-label={t("home.mkt.audiences.title")}
          className="mt-[var(--space-6)] flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map(({ id, labelKey }) => {
            const selected = tab === id;
            const tabId = `${baseId}-${id}-tab`;
            const panelId = `${baseId}-${id}-panel`;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(id)}
                className={`shrink-0 rounded-[var(--radius-sm)] px-[var(--space-4)] py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                  selected
                    ? "bg-[var(--color-teal-deep)] text-white"
                    : "bg-[var(--color-surface-2)] text-[var(--color-slate)] hover:bg-[var(--color-border-light)]"
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-${tab}-panel`}
          aria-labelledby={`${baseId}-${tab}-tab`}
          className="mt-[var(--space-6)] grid gap-[var(--space-6)] lg:grid-cols-2"
        >
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-navy)]">{content.title}</h3>
            <p className="mt-[var(--space-3)] text-base leading-relaxed text-[var(--color-slate)]">{content.body}</p>
            {content.href.startsWith("#") ? (
              <a
                href={content.href}
                className="mt-[var(--space-5)] inline-flex min-h-[44px] items-center text-base font-semibold text-[var(--color-teal-deep)] underline underline-offset-2 hover:text-[var(--color-teal)]"
              >
                {content.cta}
              </a>
            ) : (
              <Link
                href={content.href}
                className="mt-[var(--space-5)] inline-flex min-h-[44px] items-center text-base font-semibold text-[var(--color-teal-deep)] underline underline-offset-2 hover:text-[var(--color-teal)]"
              >
                {content.cta}
              </Link>
            )}
          </div>
          <ul className="space-y-[var(--space-3)] text-sm text-[var(--color-charcoal)]">
            {content.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-sage)]" strokeWidth={2.5} aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
