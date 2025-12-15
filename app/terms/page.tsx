export const metadata = {
  title: "Terms of Use · NxtStps",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Legal
          </p>
          <h1 className="text-3xl font-bold">Terms of Use</h1>
          <p className="text-sm text-slate-300">
            Placeholder page. Replace this with your official Terms when ready.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-3 text-sm text-slate-200">
          <p>
            NxtStps is a trauma-informed digital toolkit intended to help users
            organize information and prepare application drafts. It is not a law
            firm and does not provide legal advice.
          </p>
          <p>
            By using this site, you agree that you are responsible for the
            accuracy of the information you enter, and you understand that
            nothing is submitted to the state without your explicit action.
          </p>
          <p className="text-[11px] text-slate-400">
            If you’re in immediate danger, call 911. If you need support now,
            call or text 988.
          </p>
        </section>
      </div>
    </main>
  );
}