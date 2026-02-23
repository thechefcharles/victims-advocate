import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · NxtStps",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
          <Link href="/" className="hover:text-slate-200">← Home</Link>
          <Link href="/terms" className="hover:text-slate-200">Terms</Link>
          <Link href="/waiver" className="hover:text-slate-200">Liability Waiver</Link>
        </div>
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Legal
          </p>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-slate-300">
            Placeholder page. Replace this with your official Privacy Policy when ready.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-3 text-sm text-slate-200">
          <p>
            NxtStps is designed to handle sensitive information with care. This
            page will describe what data is collected, how it’s used, and what
            controls you have.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-200">
            <li>What information you provide (and why)</li>
            <li>How documents are stored</li>
            <li>How account/authentication works</li>
            <li>How sharing with an advocate works</li>
            <li>How to request deletion/export</li>
          </ul>
          <p className="text-[11px] text-slate-400">
            This is not legal advice. If you’re in immediate danger, call 911. If you need support now,
            call or text 988.
          </p>
        </section>
      </div>
    </main>
  );
}