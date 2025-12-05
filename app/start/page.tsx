// app/start/page.tsx

export default function StartPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400 mb-1">
            Start Here
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">
            What to do in the first 72 hours after a shooting
          </h1>
          <p className="text-sm text-slate-300 mt-2">
            This guide is not legal or medical advice, but a trauma-informed
            checklist to help you stay organized during a crisis.
          </p>
        </header>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold">1. Immediate safety & medical care</h2>
          <ul className="list-disc list-inside text-sm text-slate-200 space-y-1.5">
            <li>Call 911 or emergency services if you haven&apos;t already.</li>
            <li>Find out which hospital the victim was taken to.</li>
            <li>Ask for the name of the doctor, nurse, or social worker on the case.</li>
            <li>If you are with the victim, stay as calm as possible and follow medical staff instructions.</li>
          </ul>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold">2. Police report & case information</h2>
          <ul className="list-disc list-inside text-sm text-slate-200 space-y-1.5">
            <li>Ask for the police report number (also called RD, incident, or case number).</li>
            <li>Write down the name and badge number of any officers you speak with.</li>
            <li>Ask if a detective has been assigned and get their name and contact info.</li>
            <li>Keep all of this written down in one place – you&apos;ll need it for compensation and legal help.</li>
          </ul>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold">3. Start a simple record of events</h2>
          <ul className="list-disc list-inside text-sm text-slate-200 space-y-1.5">
            <li>Write down the date, time, and location of the shooting.</li>
            <li>Note who was there (friends, family, witnesses).</li>
            <li>Keep track of hospital visits, calls with detectives, and any major updates.</li>
            <li>This does not need to be perfect – it just helps your memory later.</li>
          </ul>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold">4. Emotional support</h2>
          <ul className="list-disc list-inside text-sm text-slate-200 space-y-1.5">
            <li>Ask the hospital if they have a social worker, chaplain, or victim advocate.</li>
            <li>Reach out to a trusted friend, family member, or faith leader.</li>
            <li>If you notice panic, numbness, or trouble breathing, remind yourself that shock is common – you are not weak.</li>
            <li>You can call or text a crisis line if you need to talk to someone right away.</li>
          </ul>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold">5. Preparing for compensation help</h2>
          <p className="text-sm text-slate-200">
            Within a few days, you can begin the process of applying for Illinois Crime Victims
            Compensation to help with medical bills, funeral costs, and counseling.
          </p>
          <ul className="list-disc list-inside text-sm text-slate-200 space-y-1.5">
            <li>Keep any paperwork you receive from the hospital or police.</li>
            <li>Save receipts for parking, prescriptions, or emergency expenses.</li>
            <li>Write down who is missing work or school because of the incident.</li>
          </ul>
          <p className="text-xs text-slate-400 mt-2">
            Soon, this site will include a step-by-step assistant that walks you through
            the Illinois application in plain language.
          </p>
        </section>
      </div>
    </main>
  );
}