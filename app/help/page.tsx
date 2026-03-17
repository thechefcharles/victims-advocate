export const metadata = {
  title: "Help · NxtStps",
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Support
          </p>
          <h1 className="text-3xl font-bold">Help</h1>
          <p className="text-sm text-slate-300">
            Placeholder page. Add FAQs, contact options, and crisis resources here.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-3 text-sm text-slate-200">
          <p className="font-semibold">If you’re in immediate danger:</p>
          <p>Call 911.</p>

          <p className="font-semibold pt-2">If you need support now:</p>
          <p>Call or text 988 (Suicide &amp; Crisis Lifeline).</p>

          <p className="pt-2 text-[11px] text-slate-400">
            Coming soon: more account and document help.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-2 text-sm text-slate-200">
          <p className="font-semibold text-slate-100">Transparency</p>
          <ul className="space-y-2 text-slate-300">
            <li>
              <a href="/help/transparency" className="text-teal-400 hover:text-teal-300">
                Overview — what we show vs. internal
              </a>
            </li>
            <li>
              <a href="/help/how-matching-works" className="text-teal-400 hover:text-teal-300">
                How survivor–organization matching works
              </a>
            </li>
            <li>
              <a href="/help/how-designations-work" className="text-teal-400 hover:text-teal-300">
                How organization designations work
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}