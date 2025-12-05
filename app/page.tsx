// app/page.tsx

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Victim Advocate (Illinois)
          </span>
          <h1 className="text-lg font-semibold text-slate-50">
            Gun Violence Support & Compensation Guide
          </h1>
        </div>
        <button className="text-sm rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-800 transition">
          Coming Soon: Chat Advocate
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-8 py-8 max-w-5xl w-full mx-auto space-y-8">
        {/* Hero / Main message */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg shadow-black/40">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            If you or someone you love was shot, you are not alone.
          </h2>
          <p className="text-sm sm:text-base text-slate-200 mb-4">
            This site is being built to act like a digital victim advocate. It
            will help you understand what to do after a shooting, apply for
            <span className="font-semibold"> Illinois Crime Victims Compensation</span>,
            and connect you to real-world resources for medical bills, funeral
            costs, counseling, food, and more.
          </p>

          <div className="grid gap-3 sm:grid-cols-3 mt-4">
            <button className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left text-sm hover:bg-emerald-500/20 transition">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Start Here
              </div>
              <div className="mt-1 text-slate-100">
                I need help <span className="font-semibold">right now</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Step-by-step checklist for the hours and days after a shooting.
              </p>
            </button>

            <button className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-left text-sm hover:bg-sky-500/20 transition">
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Money & Bills
              </div>
              <div className="mt-1 text-slate-100">
                Victims compensation & emergency funds
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Learn what costs can be covered and what documents you&apos;ll
                need.
              </p>
            </button>

            <button className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-3 text-left text-sm hover:bg-fuchsia-500/20 transition">
              <div className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
                Emotional Support
              </div>
              <div className="mt-1 text-slate-100">
                Grief, trauma, and family support
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Find counseling, support groups, and community resources.
              </p>
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            *This site does not replace legal advice or emergency services, but
            is designed to help you navigate resources in Illinois.
          </p>
        </section>

        {/* Sections previewing future pages */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              What to do in the first 72 hours
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
              <li>Get medical help & find out which hospital the victim is at</li>
              <li>Get the police report number and detective contact</li>
              <li>Gather names of witnesses (if safe)</li>
              <li>Ask the hospital social worker for victim services info</li>
              <li>Write down dates, times, and details while they&apos;re fresh</li>
            </ul>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              How this site will help with compensation
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
              <li>Check if you may qualify for Illinois Crime Victims Compensation</li>
              <li>Guide you through each question in the application</li>
              <li>Explain what each legal term means in plain language</li>
              <li>Help you keep track of bills, receipts, and documents</li>
              <li>Prepare a clean, ready-to-submit application packet</li>
            </ul>
          </div>
        </section>

        {/* Future chatbot area */}
        <section className="bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-2">
            Digital Victim Advocate (Chatbot) – Coming Soon
          </h3>
          <p className="text-xs text-slate-300 mb-2">
            This will be a 24/7 chat assistant that talks to you like a victim
            advocate. It will:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
            <li>Ask what happened and what you need help with</li>
            <li>Walk you through victims compensation step-by-step</li>
            <li>Suggest Illinois resources based on your answers</li>
            <li>Help you organize documents and next steps</li>
          </ul>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 sm:px-8 py-4 text-[11px] text-slate-500">
        This project is in development and focused on gunshot victims and their
        families in Illinois. If you are in immediate danger, call 911.
      </footer>
    </main>
  );
}