"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { PublicBottomCta } from "@/components/public/PublicBottomCta";

export default function StartPage() {
  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4">
          <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)]">First 72 hours</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-navy)]">
            What to do in the first 72 hours after a shooting
          </h1>
          <p className="text-base text-[var(--color-slate)] leading-relaxed">
            Practical, grounded steps you can take right away—not legal or medical advice, just a
            way to stay organized when everything feels overwhelming.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={ROUTES.compensationHub}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-teal)] transition text-center"
            >
              Get Help Now
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)]/75 transition text-center"
            >
              Start My Application
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]/85 transition text-center"
            >
              Connect With an Advocate
            </Link>
          </div>
          <p className="text-[11px] text-[var(--color-muted)]">
            Need an account to connect or apply? We&apos;ll guide you—starting is free.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 px-4 py-3 text-sm text-[var(--color-slate)]">
          <p>
            <strong className="text-[var(--color-charcoal)]">If you&apos;re in immediate danger,</strong> call{" "}
            <a href="tel:911" className="text-teal-400 hover:underline">
              911
            </a>
            . If you need someone to talk with right now, call or text{" "}
            <a href="tel:988" className="text-[#FF9B9B] font-medium hover:underline">
              988
            </a>{" "}
            (Suicide &amp; Crisis Lifeline).
          </p>
        </section>

        <section className="bg-[var(--color-warm-cream)]/85 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">
            1. Immediate safety &amp; medical care
          </h2>
          <ul className="list-disc list-inside text-sm text-[var(--color-slate)] space-y-1.5">
            <li>Call 911 or emergency services if you haven&apos;t already.</li>
            <li>Find out which hospital the victim was taken to.</li>
            <li>Ask for the name of the doctor, nurse, or social worker on the case.</li>
            <li>If you are with the victim, stay as calm as possible and follow medical staff instructions.</li>
          </ul>
        </section>

        <section className="bg-[var(--color-warm-cream)]/85 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">2. Police report &amp; case information</h2>
          <ul className="list-disc list-inside text-sm text-[var(--color-slate)] space-y-1.5">
            <li>Ask for the police report number (also called RD, incident, or case number).</li>
            <li>Write down the name and badge number of any officers you speak with.</li>
            <li>Ask if a detective has been assigned and get their name and contact info.</li>
            <li>Keep all of this written down in one place – you&apos;ll need it for compensation and legal help.</li>
          </ul>
        </section>

        <section className="bg-[var(--color-warm-cream)]/85 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">3. Start a simple record of events</h2>
          <ul className="list-disc list-inside text-sm text-[var(--color-slate)] space-y-1.5">
            <li>Write down the date, time, and location of the shooting.</li>
            <li>Note who was there (friends, family, witnesses).</li>
            <li>Keep track of hospital visits, calls with detectives, and any major updates.</li>
            <li>This does not need to be perfect – it just helps your memory later.</li>
          </ul>
        </section>

        <section className="bg-[var(--color-warm-cream)]/85 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">4. Emotional support</h2>
          <ul className="list-disc list-inside text-sm text-[var(--color-slate)] space-y-1.5">
            <li>Ask the hospital if they have a social worker, chaplain, or victim advocate.</li>
            <li>Reach out to a trusted friend, family member, or faith leader.</li>
            <li>If you notice panic, numbness, or trouble breathing, remind yourself that shock is common – you are not weak.</li>
            <li>You can call or text a crisis line if you need to talk to someone right away.</li>
          </ul>
        </section>

        <section className="bg-[var(--color-warm-cream)]/85 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">5. Preparing for compensation help</h2>
          <p className="text-sm text-[var(--color-slate)]">
            Within a few days, you can begin applying for Illinois Crime Victims Compensation to help
            with medical bills, funeral costs, and counseling—when you feel ready.
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--color-slate)] space-y-1.5">
            <li>Keep any paperwork you receive from the hospital or police.</li>
            <li>Save receipts for parking, prescriptions, or emergency expenses.</li>
            <li>Write down who is missing work or school because of the incident.</li>
          </ul>
        </section>

        <div className="rounded-2xl border border-[var(--color-border-light)] bg-white/30 px-5 py-6 text-center space-y-3">
          <p className="text-sm text-[var(--color-muted)]">Ready for the next step?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={ROUTES.compensationHub}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-teal)] transition"
            >
              Get Help Now
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)]/75 transition"
            >
              Start My Application
            </Link>
          </div>
        </div>

        <PublicBottomCta />
      </div>
    </main>
  );
}
