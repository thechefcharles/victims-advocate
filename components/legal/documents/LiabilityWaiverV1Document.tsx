const EFFECTIVE_DATE = "April 5, 2026";
const LAST_UPDATED = "April 5, 2026";

/** Full Liability Waiver v1.0 for consent scroll and /waiver. */
export function LiabilityWaiverV1Document() {
  return (
    <div
      className="space-y-6 text-base leading-relaxed text-[var(--color-charcoal)]"
      style={{ fontSize: "max(1rem, 16px)" }}
    >
      <header className="space-y-3 border-b border-[var(--color-border-light)] pb-6">
        <p className="text-xl font-bold text-[var(--color-navy)]">
          NXTSTPS, LLC — LIABILITY WAIVER AND RELEASE OF CLAIMS
        </p>
        <p className="text-sm text-[var(--color-slate)]">
          Effective Date: {EFFECTIVE_DATE} · Last Updated: {LAST_UPDATED} · Version: 1.0
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/40 p-4">
        <h2 className="text-lg font-semibold text-[var(--color-navy)]">A NOTE BEFORE YOU READ THIS DOCUMENT</h2>
        <p>
          NxtStps helps people prepare and submit crime victim compensation applications. This document
          explains — clearly and honestly — what NxtStps can and cannot do, and what you are agreeing to
          before you use the platform.
        </p>
        <p className="font-medium text-[var(--color-navy)]">The most important things to know:</p>
        <p>
          NxtStps guides you through the application process. NxtStps does not make legal decisions,
          does not determine eligibility, and does not guarantee that any application will be approved.
        </p>
        <p>
          The final decisions about your application belong to the state agency that administers the
          program — not to NxtStps.
        </p>
        <p>
          This document asks you to acknowledge those limits before you begin. Reading it carefully will
          help you understand what to expect from the platform and what remains your responsibility.
        </p>
        <p>
          If you need legal advice, an applicant advocate can help you find it. If you are in crisis, see
          Section 8.3 of this document.
        </p>
      </section>

      <p>
        This Liability Waiver and Release of Claims (&quot;Waiver&quot;) is a legally binding agreement
        between you (&quot;User,&quot; &quot;you,&quot; &quot;your&quot;) and NxtStps, LLC, an Illinois
        limited liability company, together with its members, managers, officers, employees,
        contractors, and agents (collectively, &quot;NxtStps,&quot; &quot;Company,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;).
      </p>
      <p>
        This Waiver is presented as Step 3 of the NxtStps consent flow. By clicking &quot;I Agree and
        Begin,&quot; you acknowledge that you have also accepted the NxtStps Terms of Use and Privacy
        Policy, and that you now agree to the additional terms set out in this Waiver. All capitalized
        terms not defined here have the meanings given to them in the Terms of Use.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 1 — ACKNOWLEDGMENT OF NON-PROFESSIONAL STATUS
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.1 No Legal Advice or Legal Representation</h3>
      <p>User acknowledges and agrees that NxtStps:</p>
      <p>
        (a) is not a law firm and does not employ attorneys in a legal services capacity; (b) does not
        provide legal advice, legal interpretation, or legal advocacy of any kind; (c) does not review
        submissions for legal sufficiency or compliance with any specific program&apos;s requirements;
        (d) does not apply law to User-specific facts or circumstances; and (e) does not act as a legal
        representative, legal advocate, or agent in any legal, administrative, or judicial matter.
      </p>
      <p>No attorney-client relationship is created through use of the Platform under any circumstances.</p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        1.2 No Medical, Clinical, or Therapeutic Services
      </h3>
      <p>
        User acknowledges that NxtStps is not a provider of medical, psychological, psychiatric,
        crisis-intervention, trauma therapy, or clinical services of any kind. The Platform&apos;s
        trauma-informed design features — including compassionate language, pacing controls, and the
        Survivor Safety Mode — are design features intended to reduce unnecessary distress during the
        application process. They do not constitute clinical care, crisis intervention, or therapeutic
        treatment.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.3 No Guarantee of Eligibility or Outcomes</h3>
      <p>
        User acknowledges that NxtStps does not guarantee, predict, or represent that any application
        submitted through the Platform will be approved, awarded, or processed within any particular
        timeframe. All eligibility determinations are made exclusively by the relevant state
        administering agency. NxtStps has no role in and no influence over those determinations.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 2 — ASSUMPTION OF RISKS</h2>
      <p>
        User expressly understands, acknowledges, and agrees that use of the Platform to prepare and
        submit a crime victim compensation application involves inherent risks that NxtStps cannot
        eliminate. These risks include but are not limited to:
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Submission of incomplete or inaccurate information due to User error or misunderstanding of program requirements</li>
        <li>Denial, delay, or rejection of applications by the administering agency</li>
        <li>Adverse outcomes in benefit or compensation claims that are unrelated to the quality of the application</li>
        <li>
          Missed deadlines or procedural deficiencies arising from program rules that change or that the
          Platform&apos;s guidance does not fully reflect
        </li>
        <li>Technical errors in document formatting, upload, or transmission</li>
        <li>Misinterpretation of third-party program requirements by the User</li>
        <li>Inaccurate, outdated, or incomplete AI-generated suggestions that the User relies upon without independent verification</li>
        <li>Data entry, upload, or transmission errors introduced by the User</li>
      </ul>
      <p>
        User voluntarily assumes all such risks, whether known or unknown at the time of accepting this
        Waiver, as inherent features of the application process and the nature of administrative benefit
        programs.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 3 — RELEASE OF CLAIMS</h2>
      <p>
        In consideration for NxtStps making the Platform available at no cost to Applicants, User hereby
        releases, waives, and forever discharges NxtStps from any and all claims, liabilities, damages,
        losses, demands, causes of action, and legal proceedings — whether known or unknown, suspected or
        unsuspected, direct or indirect — arising out of or connected to Platform use, subject to the
        limitations stated in Section 3.7.
      </p>
      <p>This release includes, without limitation, claims based on:</p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.1 Negligence</h3>
      <p>User releases NxtStps from claims alleging ordinary negligence arising from:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Guidance provided by the Platform&apos;s rules engine, AI systems, or informational content</li>
        <li>Processing or handling of User-provided information</li>
        <li>Generation of AI outputs, completeness assessments, or eligibility guidance</li>
        <li>Technical malfunctions, system errors, or service interruptions</li>
        <li>Documentation support functions</li>
        <li>Failure to warn of consequences of specific answers, omissions, or document choices</li>
      </ul>
      <p>
        This release covers ordinary negligence only. It does not release NxtStps from claims arising
        from gross negligence or willful misconduct. See Section 3.7.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.2 Unauthorized Practice of Law</h3>
      <p>
        User acknowledges and agrees that the Platform&apos;s guidance, rules engine logic, eligibility
        pre-screening, and AI-assisted features are administrative and informational in nature — not legal
        advice or legal services. User releases NxtStps from any claim asserting that the Platform&apos;s
        functionality constituted or contributed to unauthorized practice of law. User acknowledges that
        they have been clearly informed that NxtStps is not a law firm and does not provide legal
        services, and that they are proceeding with that understanding.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.3 Reliance on Platform Content</h3>
      <p>User releases NxtStps from claims alleging that User relied to their detriment on:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Information, guidance, or descriptions provided through the Platform</li>
        <li>AI-generated outputs, suggestions, or completeness assessments</li>
        <li>Workflow descriptions or eligibility pre-screening results</li>
        <li>Any representation about the Platform&apos;s capabilities</li>
      </ul>
      <p>
        User acknowledges that independent verification of all Platform outputs before submission is
        required under the Terms of Use, and that NxtStps&apos;s liability for reliance claims is
        released to the extent such reliance occurred without independent verification.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.4 Product Liability</h3>
      <p>User releases NxtStps from claims arising from:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Software bugs, defects, or unexpected behavior</li>
        <li>Service outages or downtime during the application preparation process</li>
        <li>Data loss or corruption due to technical failure</li>
        <li>Failure of automated systems to perform as intended</li>
      </ul>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        3.5 Emotional Difficulty Associated with the Application Process
      </h3>
      <p>
        User acknowledges that completing documentation related to violent crime, injury, loss, or trauma
        may be emotionally difficult. The nature of crime victim compensation applications requires Users
        to describe traumatic events, review incident documentation, and engage with content that may
        surface difficult memories and emotions. This emotional difficulty is an inherent feature of the
        subject matter — not a consequence of Platform design or malfunction.
      </p>
      <p>
        User agrees that NxtStps shall not be liable for emotional distress, psychological discomfort,
        or trauma responses arising from the nature of crime victim compensation documentation, the
        subject matter Users are required to address in their applications, or the process of revisiting
        traumatic events. This release does not apply to emotional distress claims arising from gross
        negligence or willful misconduct by NxtStps.
      </p>
      <p>
        NxtStps has designed the Platform with trauma-informed principles — including compassionate
        language, pacing features, skip options, and Survivor Safety Mode — specifically to reduce
        unnecessary distress during the application process. If you are experiencing a mental health
        crisis at any point during your use of the Platform, please see Section 8.3 of this Waiver.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.6 Failure to Identify Missing Documents</h3>
      <p>
        The Platform&apos;s document completeness validation feature is designed to assist Users in
        identifying commonly required documents. User releases NxtStps from claims alleging that the
        completeness validation feature failed to identify every document required by the specific
        program to which the User applied, recognizing that program requirements vary and change, and
        that the User retains sole responsibility for verifying that their submission is complete before
        filing.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.7 Third-Party Agency Decisions</h3>
      <p>User acknowledges and agrees that NxtStps has no role in, no influence over, and no responsibility for decisions made by:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>State and local victim compensation programs</li>
        <li>Law enforcement agencies</li>
        <li>Courts and administrative tribunals</li>
        <li>Medical institutions and healthcare providers</li>
        <li>Victim assistance programs and social service agencies</li>
        <li>Any third-party recipient of User-directed submissions</li>
      </ul>
      <p>
        User releases NxtStps from all claims arising from or related to the decisions, actions,
        delays, or errors of any of these third parties, including denial or reduction of any
        compensation claim.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.8 Scope and Limitations of This Release</h3>
      <p>This release does not apply to and does not release NxtStps from:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>(a) Claims arising from NxtStps&apos;s gross negligence or willful misconduct;</li>
        <li>(b) Claims arising from NxtStps&apos;s intentional misrepresentation of the Platform&apos;s capabilities;</li>
        <li>(c) Claims that cannot be waived as a matter of applicable law;</li>
        <li>(d) NxtStps&apos;s obligations under VOCA, VAWA, and applicable victim confidentiality statutes; or</li>
        <li>
          (e) Any data breach or unauthorized disclosure of User information caused by NxtStps&apos;s
          failure to maintain reasonable security safeguards.
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 4 — PROVIDER USERS COMPLETING THIS WAIVER</h2>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">4.1 Advocates Acting on Behalf of Applicants</h3>
      <p>
        If you are a Provider user — an applicant advocate, case manager, or other authorized representative
        — completing this Waiver in the course of using the Platform on behalf of an Applicant, the
        following additional provisions apply:
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          (a) You represent that you are authorized by your Organization and, where applicable, by the
          Applicant, to use the Platform on their behalf.
        </li>
        <li>
          (b) You acknowledge that this Waiver binds you in your capacity as a Provider user and does not
          substitute for or replace any waiver or consent obtained from or required of the Applicant.
        </li>
        <li>
          (c) You acknowledge that the Applicant&apos;s right to exercise data rights, request deletion,
          and make decisions about their application remains with the Applicant and cannot be overridden
          by your organizational role.
        </li>
        <li>
          (d) You agree that your use of the Platform on behalf of an Applicant is subject to all
          applicable confidentiality obligations under VOCA, VAWA, and applicable state law.
        </li>
      </ul>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">4.2 Organizational Responsibility</h3>
      <p>
        Organizations whose staff access the Platform as Provider users bear responsibility for ensuring
        that their staff members understand and comply with the terms of this Waiver, the Terms of Use,
        and all applicable confidentiality requirements. The Organization&apos;s acceptance of a licensing
        agreement with NxtStps constitutes the Organization&apos;s agreement to these obligations on behalf
        of its staff.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 5 — USER&apos;S DUTY TO VERIFY</h2>
      <p>
        User acknowledges and agrees that NxtStps does not review, verify, approve, or certify any
        submission made through the Platform. User bears sole responsibility for:
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          (a) independently reviewing all Platform outputs — including AI-generated suggestions,
          completeness assessments, and pre-filled fields — before signing, certifying, or submitting any
          document;
        </li>
        <li>(b) the accuracy and completeness of all information entered through the Platform;</li>
        <li>(c) ensuring that their submission complies with the specific requirements of the program to which they are applying;</li>
        <li>(d) understanding the eligibility criteria of the relevant program;</li>
        <li>(e) meeting all applicable filing deadlines; and</li>
        <li>(f) maintaining their own copies of all submitted documents.</li>
      </ul>
      <p>
        Reliance on Platform outputs without independent verification is at the User&apos;s sole risk and
        is inconsistent with the Terms of Use. The Platform is a tool to assist in preparation — the
        User is the decision-maker and the signatory.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 6 — CROSS-REFERENCE TO TERMS OF USE</h2>
      <p>
        The following provisions, which are fully stated in the NxtStps Terms of Use accepted by User
        in Step 1 of the consent flow, are incorporated into this Waiver by reference and apply with
        equal force here. They are not restated in this document to avoid redundancy and potential
        inconsistency between the two documents. In the event of any conflict between a provision of this
        Waiver and a provision of the Terms of Use, the Terms of Use controls unless the Waiver provision
        is more protective of NxtStps.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border-light)]">
        <table className="w-full min-w-[280px] border-collapse text-left text-sm">
          <caption className="sr-only">Cross-reference from Waiver subjects to Terms of Use sections</caption>
          <thead>
            <tr className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)]">
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Subject
              </th>
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Terms of Use Section
              </th>
            </tr>
          </thead>
          <tbody className="text-[var(--color-charcoal)]">
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Limitation of Liability and Aggregate Cap</td>
              <td className="p-3">Section 16</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Indemnification</td>
              <td className="p-3">Section 17</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Mandatory Arbitration and Class Action Waiver</td>
              <td className="p-3">Section 18</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Governing Law</td>
              <td className="p-3">Section 21</td>
            </tr>
            <tr>
              <td className="p-3">Severability</td>
              <td className="p-3">Section 25</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        By accepting this Waiver, User confirms that they have already accepted the Terms of Use and that
        the provisions listed above are known to them, understood, and agreed to.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 7 — NO WARRANTIES</h2>
      <p>
        The Platform is provided strictly &quot;as is&quot; and &quot;as available&quot; without warranties
        of any kind. NxtStps does not warrant:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>The accuracy, completeness, or currency of any content, guidance, or AI output</li>
        <li>The eligibility outcomes of any application prepared through the Platform</li>
        <li>The successful submission, acceptance, or processing of any document by a third-party agency</li>
        <li>The uninterrupted or error-free operation of the Platform at all times</li>
      </ul>
      <p>
        These disclaimers apply in addition to and are consistent with the full warranty disclaimer
        stated in Terms of Use Section 15.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 8 — KNOWING AND VOLUNTARY AGREEMENT</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">8.1 Conspicuous Notice</h3>
      <p>
        User acknowledges that this Waiver contains material provisions that substantially limit
        User&apos;s rights and NxtStps&apos;s liability. User has been provided with the full text of this
        Waiver, has been required to scroll through it before acceptance, and has had the opportunity to
        review it at their own pace before clicking to agree.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">8.2 Voluntary Consent</h3>
      <p>User affirms that they are accepting this Waiver:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>(a) voluntarily and without coercion, undue influence, or pressure of any kind;</li>
        <li>(b) with a reasonable opportunity to review the full text before accepting;</li>
        <li>
          (c) with the understanding that declining is an available option that will not result in
          discrimination or retaliation; and
        </li>
        <li>
          (d) after having been informed in plain language of the most important provisions of this
          Waiver before the full text was presented.
        </li>
      </ul>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">8.3 Age and Guardian Representation</h3>
      <p>User represents that:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>(a) they are 18 years of age or older; or</li>
        <li>
          (b) if they are under 18, a parent or legal guardian has reviewed this Waiver and is accepting
          it on their behalf in compliance with the Platform&apos;s minor consent protocols described in
          the Terms of Use.
        </li>
      </ul>
      <p>
        This provision is limited to age and guardian authorization. NxtStps does not require users to
        represent their mental state or psychological capacity as a condition of accepting this Waiver.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">8.4 Crisis Support</h3>
      <p>
        NxtStps recognizes that completing a crime victim compensation application can be emotionally
        difficult. If you are experiencing a mental health crisis at any point — before, during, or after
        using the Platform — please reach out for support:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>988 Suicide and Crisis Lifeline: Call or text 988</li>
        <li>Crisis Text Line: Text HOME to 741741</li>
        <li>Emergency Services: Call 911</li>
      </ul>
      <p>
        NxtStps is not a crisis support service. These resources are provided because your wellbeing
        matters, and you should not be alone in a difficult moment.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">USER ACKNOWLEDGMENT</h2>
      <p>By clicking &quot;I Agree and Begin,&quot; User confirms that they have:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>(a) read or had the opportunity to read this Waiver in full;</li>
        <li>(b) already accepted the NxtStps Terms of Use and Privacy Policy;</li>
        <li>(c) understood that this Waiver contains material limitations on their legal rights;</li>
        <li>(d) accepted this Waiver voluntarily, without coercion or undue influence;</li>
        <li>
          (e) confirmed that they are 18 or older, or that a parent or guardian is accepting on their
          behalf; and
        </li>
        <li>
          (f) understood that declining this Waiver means they will not be able to access the Platform
          but that such a decision will not result in discrimination or retaliation of any kind.
        </li>
      </ul>

      <p className="text-sm text-[var(--color-muted)] pt-4">
        NxtStps, LLC · Chicago, Illinois · nxtstps.com · Confidential and Proprietary
      </p>
    </div>
  );
}
