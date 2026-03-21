import Link from "next/link";
import { PublicBottomCta } from "@/components/public/PublicBottomCta";
import { ROUTES } from "@/lib/routes/pageRegistry";

const HUB_LINKS = [
  {
    href: ROUTES.compensationHub,
    title: "Compensation Help",
    description: "Start or continue a Crime Victims Compensation application—Illinois or Indiana.",
  },
  {
    href: "/start",
    title: "First 72 Hours",
    description: "Grounded steps after a shooting—safety, records, and emotional support.",
  },
  {
    href: "/help/transparency",
    title: "Transparency",
    description: "What we show publicly vs. what stays internal on the platform.",
  },
  {
    href: "/help/how-matching-works",
    title: "How Matching Works",
    description: "How we suggest organizations—needs first, explainable reasons.",
  },
  {
    href: "/help/how-designations-work",
    title: "How Designations Work",
    description: "What organization labels mean here—and what they don’t mean.",
  },
] as const;

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-2 text-center sm:text-left">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Support</p>
          <h1 className="text-3xl font-bold text-slate-50">Help</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Find compensation help, crisis resources, and plain-language explanations of how
            NxtStps handles matching and trust.
          </p>
        </header>

        <section aria-labelledby="hub-heading">
          <h2 id="hub-heading" className="sr-only">
            Help topics
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {HUB_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block h-full rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 hover:border-emerald-500/30 hover:bg-slate-900/50 transition"
                >
                  <span className="text-sm font-semibold text-slate-100">{item.title}</span>
                  <span className="mt-1 block text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6 space-y-3 text-sm text-slate-300">
          <h2 className="text-base font-semibold text-slate-100">Crisis &amp; emergency</h2>
          <p>
            <strong className="text-slate-200">Immediate danger:</strong> call{" "}
            <a href="tel:911" className="text-teal-400 hover:underline">
              911
            </a>
            .
          </p>
          <p>
            <strong className="text-slate-200">Need to talk now:</strong> call or text{" "}
            <a href="tel:988" className="text-[#FF9B9B] font-medium hover:underline">
              988
            </a>{" "}
            (Suicide &amp; Crisis Lifeline).
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400 space-y-2">
          <h2 className="text-base font-semibold text-slate-200">Account &amp; basics</h2>
          <p>
            Use{" "}
            <Link href="/login" className="text-teal-400 hover:underline">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className="text-teal-400 hover:underline">
              Create account
            </Link>{" "}
            to save applications and message your team. For safety tools, see{" "}
            <Link href={ROUTES.settingsSafety} className="text-teal-400 hover:underline">
              Safety settings
            </Link>
            .
          </p>
        </section>

        <PublicBottomCta />
      </div>
    </main>
  );
}
