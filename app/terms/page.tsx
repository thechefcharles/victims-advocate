import Link from "next/link";

export const metadata = {
  title: "Terms of Use · NxtStps",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-200">← Home</Link>
          <Link href="/privacy" className="hover:text-slate-200">Privacy</Link>
          <Link href="/waiver" className="hover:text-slate-200">Liability Waiver</Link>
        </div>
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Legal
          </p>
          <h1 className="text-3xl font-bold">NXTSTPS – TERMS OF USE</h1>
          <p className="text-sm text-slate-300">
            Effective Date: January 2025 · Last Updated: January 2025
          </p>
        </header>

        <section className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-200">
          <p className="font-semibold text-slate-100">
            PLEASE READ THESE TERMS CAREFULLY. YOUR ACCESS TO OR USE OF THE NXTSTPS
            PLATFORM CONSTITUTES YOUR AFFIRMATIVE ACKNOWLEDGMENT, ACCEPTANCE, AND
            AGREEMENT TO BE FULLY BOUND BY THESE TERMS OF USE (“TERMS”). IF YOU DO
            NOT AGREE TO ALL TERMS, YOU MUST IMMEDIATELY DISCONTINUE USE OF THE
            PLATFORM.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you
            (“User”) and NxtStps Technologies LLC, together with its parent and
            affiliates (“NxtStps,” “Company,” “we,” “us,” or “our”).
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 1 – PURPOSE OF PLATFORM; NO LEGAL, MEDICAL, OR PROFESSIONAL SERVICES
          </h2>
          <h3 className="text-base font-medium text-slate-200">1.1 Purpose</h3>
          <p>
            The Platform provides administrative, clerical, and informational
            tools designed to support Users in gathering documentation,
            organizing information, preparing form responses, and facilitating
            the submission of materials to third-party victim-service programs
            or related agencies. All functionality, including automated and
            AI-assisted systems, operates exclusively as non-advisory,
            non-interpretive informational support.
          </p>
          <h3 className="text-base font-medium text-slate-200">1.2 No Legal Advice or Legal Representation</h3>
          <p>
            NxtStps is not a law firm, and no content, feature, tool,
            automation, or output of the Platform shall be construed as: (a)
            legal advice; (b) legal interpretation; (c) analysis of legal
            rights, obligations, or remedies; (d) representation before any
            agency or legal body; or (e) individualized or fact-specific legal
            guidance. No attorney–client relationship is created through use of
            the Platform.
          </p>
          <h3 className="text-base font-medium text-slate-200">1.3 No Medical, Clinical, or Therapeutic Advice</h3>
          <p>
            NxtStps does not provide medical, mental health, psychological,
            crisis-intervention, or therapeutic services. Users who require such
            support must seek qualified professional assistance.
          </p>
          <h3 className="text-base font-medium text-slate-200">1.4 No Guarantee of Outcomes or Eligibility</h3>
          <p>
            NxtStps does not guarantee, warrant, predict, or represent that any
            User will: (a) qualify for any program; (b) receive any benefit,
            decision, or award; (c) avoid errors, omissions, or denials; or (d)
            meet any deadlines or submission requirements. All determinations
            are solely the responsibility of the User and/or the third-party
            agency receiving the submission.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 2 – CONSPICUOUS ACKNOWLEDGMENT OF MATERIAL TERMS
          </h2>
          <p>
            User acknowledges and agrees that access to the Platform is
            expressly conditioned upon affirmative acceptance of these Terms
            through a clickwrap mechanism. User acknowledges the conspicuous
            and material nature of the following terms: disclaimer of legal
            advice; no duty of care; limitation of liability; indemnification;
            mandatory arbitration and waiver of class actions; AI limitations;
            user responsibility for all verification; no guarantees or
            warranties. User acknowledges that these provisions constitute
            essential consideration for NxtStps’ willingness to make the
            Platform available.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 3 – USER REPRESENTATIONS, RESPONSIBILITIES & VERIFICATION DUTIES
          </h2>
          <p>
            User bears sole and exclusive responsibility for all information,
            statements, and documents entered, uploaded, or submitted through
            the Platform. User must independently review all outputs, including
            automated or AI-generated content, before signing, submitting,
            relying upon, or transmitting such outputs to any third party. User
            acknowledges that NxtStps does not review, approve, edit, interpret,
            or verify User submissions, and shall not be liable for
            inaccuracies, omissions, or consequences. User waives any claim
            alleging that NxtStps caused or contributed to denials, adverse
            decisions, missed deadlines, procedural deficiencies, or financial,
            legal, or administrative harm.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 4 – PROHIBITION AGAINST UNAUTHORIZED PRACTICE OF LAW (UPL DEFENSE)
          </h2>
          <p>
            User acknowledges that NxtStps does not—under any
            circumstances—interpret statutes, regulations, eligibility
            criteria, procedural rules, or legal requirements. Platform
            functionality is exclusively clerical and informational. All
            decisions regarding legal compliance, eligibility, or procedural
            actions remain solely with the User.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 5 – ARTIFICIAL INTELLIGENCE DISCLOSURES
          </h2>
          <p>
            User acknowledges that AI-generated suggestions may be inaccurate,
            incomplete, outdated, or unsuitable. AI systems do not make legal,
            factual, or eligibility determinations. All AI outputs must be
            independently reviewed and verified by the User. NxtStps disclaims
            all liability for reliance on AI-generated content.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 6 – NO DUTY OF CARE; ANTI-NEGLIGENCE PROVISIONS
          </h2>
          <p>
            NxtStps has no duty to review submissions for accuracy, warn of
            consequences, identify missing documents, correct errors, or ensure
            compliance with any program rules. User waives any claim arising
            from foreseeable harms or risks associated with application
            processes. NxtStps is not responsible for updating information to
            reflect legal or regulatory changes.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 7 – PRIVACY & DATA SECURITY DISCLAIMERS
          </h2>
          <p>
            NxtStps employs commercially reasonable safeguards but does not
            guarantee absolute security of data. NxtStps is not liable for
            actions by third-party agencies, service providers, or User-selected
            recipients.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 8 – EMOTIONAL DISTRESS LIABILITY SHIELD
          </h2>
          <p>
            User acknowledges that completing victim-related documentation may
            evoke distress and that such distress is not attributable to the
            Platform. NxtStps bears no responsibility for emotional,
            psychological, or crisis-related impacts arising from Platform use.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 9 – PRODUCT FUNCTIONALITY & SERVICE LIMITATIONS
          </h2>
          <p>
            NxtStps does not warrant uninterrupted service, error-free
            functionality, absence of defects, or preservation of data. User
            shall maintain copies of all documents and information.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 10 – LIMITATION OF LIABILITY
          </h2>
          <p className="font-semibold text-slate-100">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, NXTSTPS SHALL NOT BE LIABLE
            FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR
            PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA,
            BENEFITS, OPPORTUNITIES, OR EMOTIONAL DISTRESS. TOTAL AGGREGATE
            LIABILITY SHALL NOT EXCEED THE GREATER OF: (a) THE AMOUNT PAID BY
            USER IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (b) ONE
            HUNDRED DOLLARS ($100).
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 11 – INDEMNIFICATION
          </h2>
          <p>
            User shall indemnify, defend, and hold harmless NxtStps and its
            affiliates from all claims arising from: User reliance on Platform
            outputs; User-provided inaccuracies; User submissions to third
            parties; allegations of UPL based on User misinterpretation; data
            handling by User or third parties.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 12 – FTC COMPLIANCE; NO REPRESENTATIONS
          </h2>
          <p>
            No marketing statement, content, or AI output constitutes a
            guarantee, promise, assurance, or prediction of outcomes.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 13 – MANDATORY ARBITRATION & CLASS ACTION WAIVER
          </h2>
          <p>
            This arbitration clause shall be interpreted as a standalone
            agreement. All disputes shall be resolved exclusively by binding
            arbitration administered by the American Arbitration Association
            (AAA) in Chicago, Illinois. User waives all rights to participate
            in class, collective, or representative actions. User may opt out of
            arbitration within thirty (30) days of account creation by written
            notice.
          </p>

          <h2 className="text-lg font-semibold text-slate-100 pt-4">
            SECTION 14 – SEVERABILITY, ENTIRE AGREEMENT, AND AMENDMENTS
          </h2>
          <p>
            If any provision is held unenforceable, the remaining provisions
            shall remain in effect to the fullest extent permitted by law.
          </p>

          <p className="text-[11px] text-slate-400 pt-6">
            If you’re in immediate danger, call 911. If you need support now,
            call or text 988.
          </p>
        </section>
      </div>
    </main>
  );
}
