import { getLegalSupportEmail, getPrivacyPolicyEmail } from "@/lib/legal/platformLegalConfig";

const EFFECTIVE_DATE = "April 5, 2026";
const LAST_UPDATED = "April 5, 2026";

/** Full Beta Platform and Pilot Program Acknowledgment v1.0 (Step 4 consent + public reference). */
export function BetaPilotAcknowledgmentV1Document() {
  const supportEmail = getLegalSupportEmail();
  const privacyEmail = getPrivacyPolicyEmail();

  return (
    <div
      className="space-y-6 text-base leading-relaxed text-[var(--color-charcoal)]"
      style={{ fontSize: "max(1rem, 16px)" }}
    >
      <header className="space-y-3 border-b border-[var(--color-border-light)] pb-6">
        <p className="text-xl font-bold text-[var(--color-navy)]">
          NXTSTPS, LLC — BETA PLATFORM AND PILOT PROGRAM ACKNOWLEDGMENT
        </p>
        <p className="text-sm text-[var(--color-slate)]">
          Effective Date: {EFFECTIVE_DATE} · Last Updated: {LAST_UPDATED} · Version: 1.0
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/40 p-4">
        <h2 className="text-lg font-semibold text-[var(--color-navy)]">BEFORE YOU BEGIN — PLEASE READ THIS CAREFULLY</h2>
        <p>
          NxtStps is currently operating as an early-stage platform in active development. This
          acknowledgment explains what that means for you and what you can expect from your experience.
        </p>
      </section>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 1 — WHAT STAGE THIS PLATFORM IS AT</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.1 This Platform Is a Work in Progress</h3>
      <p>
        The version of NxtStps you are accessing is a minimum viable product (MVP) — an early functional
        version of the platform being tested with a limited group of pilot participants. It is not a
        finished product. It is not a fully tested product. It is a working platform that is being actively
        improved based on real-world use, feedback from pilot participants, and ongoing development by
        the NxtStps engineering team.
      </p>
      <p>We are being transparent about this because you deserve to know exactly what you are using before you use it.</p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.2 What MVP Means in Practice</h3>
      <p>As an MVP-stage platform, NxtStps:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          is under active development — the platform is being built, tested, and improved on an ongoing
          basis
        </li>
        <li>may contain bugs, errors, or unexpected behaviors that have not yet been identified or corrected</li>
        <li>may perform differently across different devices, browsers, and operating environments</li>
        <li>
          may not include all features described in NxtStps documentation, investor materials, or partner
          presentations — some features are still being built
        </li>
        <li>may include features that are in prototype form and may change significantly before full release</li>
      </ul>
      <p>
        None of this affects the underlying legal agreements you have already accepted in this consent
        flow. Your data rights, NxtStps&apos;s confidentiality obligations, and all platform protections
        described in the Terms of Use and Privacy Policy apply fully regardless of the platform&apos;s
        development stage.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 2 — THE PILOT PROGRAM</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">2.1 You Are Participating in a Structured Pilot</h3>
      <p>
        Your use of NxtStps at this stage is part of a structured pilot program being conducted by NxtStps
        in partnership with a limited number of organizations. Pilot programs allow NxtStps to test the
        platform with real users, identify problems, gather feedback, and improve the platform before
        broader deployment.
      </p>
      <p>
        By using the platform at this stage, you are a pilot participant. This is a meaningful role —
        your experience directly shapes how the platform develops and how it serves victims and advocates in
        the future.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">2.2 What Pilot Participation Means</h3>
      <p>As a pilot participant:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          You may encounter features that do not work as expected — if you do, please report them using the
          feedback mechanism in the platform or by contacting us at{" "}
          <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
        </li>
        <li>
          You may be asked to provide feedback about your experience — participation in feedback is
          voluntary and will not affect your access to the platform
        </li>
        <li>
          Your use of the platform during the pilot helps NxtStps identify issues, validate workflows, and
          improve the application process for future users
        </li>
        <li>You are not obligated to complete any application or workflow you are not comfortable completing</li>
      </ul>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 3 — PLATFORM CHANGES DURING YOUR USE</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.1 The Platform Will Change</h3>
      <p>
        NxtStps is actively releasing updates, corrections, and new features on an ongoing basis during
        the pilot period. This means:
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Features may be added, modified, or temporarily removed without advance notice</li>
        <li>
          The user interface may change between sessions — screens, buttons, and workflows may look
          different from one visit to the next
        </li>
        <li>Platform behavior may change as bugs are corrected and improvements are made</li>
        <li>Some features may be temporarily unavailable during updates or maintenance</li>
      </ul>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.2 How Changes Are Handled</h3>
      <p>NxtStps makes every effort to minimize disruption during updates. Specifically:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          Your saved application data is preserved across platform updates — a platform update will not
          delete your progress or require you to start over
        </li>
        <li>
          If a change affects a feature you are actively using, NxtStps will communicate that change through
          the platform as soon as reasonably practicable
        </li>
        <li>
          Scheduled maintenance that requires the platform to be temporarily offline will be announced in
          advance where possible
        </li>
        <li>
          Emergency patches — corrections to critical bugs or security issues — may be deployed without
          advance notice
        </li>
      </ul>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.3 No Guarantee of Feature Availability</h3>
      <p>
        NxtStps does not guarantee that any specific feature, workflow, or functionality available at the
        time of your first use will remain available throughout the pilot period or beyond. Features may be
        changed or removed based on testing results, regulatory guidance, or platform development
        decisions. The core application preparation and submission functionality is the stable foundation
        of the platform — changes to supporting features will not prevent you from completing and
        submitting your application.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 4 — DATA DURING THE PILOT PERIOD</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">4.1 Your Data Is Protected During Development</h3>
      <p>
        The same data protections described in the Privacy Policy and Data Governance Policy apply fully
        during the pilot period. Your personal information, application data, and uploaded documents are
        protected by VOCA and VAWA confidentiality requirements, encrypted at rest and in transit, and
        stored on US-based servers regardless of the platform&apos;s development stage. Platform
        development and testing activities do not compromise these protections.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">4.2 Test Environments</h3>
      <p>
        NxtStps maintains separate development and testing environments that are completely isolated from
        the production environment where your data lives. Developer and engineering activities occur in
        these isolated environments using synthetic or anonymized data. No NxtStps engineering activity
        involves access to real pilot participant data except as strictly necessary for a documented
        security or compliance investigation.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">4.3 Feedback and Usage Data</h3>
      <p>
        If you consent to share feedback about your experience, your feedback will be used to improve the
        platform. Feedback data is handled in accordance with the Privacy Policy. You may withdraw your
        consent to feedback collection at any time without affecting your access to the platform.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 5 — WHAT TO DO IF SOMETHING GOES WRONG</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">5.1 Reporting Issues</h3>
      <p>
        If you encounter a problem with the platform — a bug, an error, unexpected behavior, or anything
        that prevented you from completing a task — please report it. NxtStps takes every bug report
        seriously because every issue you encounter may also affect other pilot participants.
      </p>
      <p>To report an issue:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Use the feedback button available within the platform, or</li>
        <li>
          Email NxtStps at{" "}
          <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>{" "}
          with a description of what happened, what screen you were on, and what device and browser you were
          using
        </li>
      </ul>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">5.2 If Your Application Data Is Affected</h3>
      <p>In the unlikely event that a platform issue affects the integrity of your application data, NxtStps will:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Notify you as soon as the issue is identified and assessed</li>
        <li>Explain what data was affected and what steps NxtStps is taking to restore or protect it</li>
        <li>Assist you in recovering or re-entering any application information that was lost or corrupted</li>
        <li>Ensure that any issue affecting your application data does not prevent you from completing your application</li>
      </ul>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">5.3 Escalation</h3>
      <p>
        If you have a concern about the platform that is not resolved through the standard support channel,
        you may contact NxtStps directly at{" "}
        <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
          {privacyEmail}
        </a>
        . All escalated concerns will receive a response within 5 business days.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 6 — THE RELATIONSHIP BETWEEN THIS ACKNOWLEDGMENT AND YOUR OTHER AGREEMENTS
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.1 This Acknowledgment Does Not Modify Your Other Rights</h3>
      <p>
        This acknowledgment is supplemental to — and does not override — the Terms of Use, Privacy Policy,
        and Liability Waiver you have already accepted in this consent flow. All rights and protections
        established in those documents apply fully and without limitation regardless of the platform&apos;s
        pilot or MVP status.
      </p>
      <p>Specifically:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>NxtStps&apos;s data confidentiality obligations under VOCA and VAWA are not modified by this acknowledgment</li>
        <li>Your right to request deletion of your data is not modified by this acknowledgment</li>
        <li>NxtStps&apos;s limitation of liability and indemnification provisions in the Terms of Use remain in effect</li>
        <li>The arbitration requirement in the Terms of Use remains in effect</li>
      </ul>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.2 When This Acknowledgment Expires</h3>
      <p>
        This acknowledgment governs your use of the platform during the period in which NxtStps is
        operating as an MVP or pilot-stage platform. When NxtStps transitions to full production
        deployment, this acknowledgment will be retired and replaced with a general platform use
        acknowledgment. You will be notified of this transition and may be asked to re-accept updated
        consent documents at that time.
      </p>

      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.3 Updates to This Acknowledgment</h3>
      <p>
        NxtStps may update this acknowledgment to reflect changes in the platform&apos;s development status.
        Material updates will be communicated consistent with the amendment mechanism in the Terms of Use.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 7 — THANK YOU FOR BEING A PILOT PARTICIPANT</h2>
      <p>
        We want to say this plainly: your participation in this pilot matters. NxtStps was built because
        the crime victim compensation process is broken — too slow, too complex, too inaccessible for the
        people who need it most. You are helping build the platform that fixes that.
      </p>
      <p>
        We are grateful for your trust in allowing us to support you through this process at an early stage,
        and we are committed to earning that trust every day the platform operates.
      </p>
      <p>
        If you have questions about the platform, your participation in the pilot, or anything in this
        acknowledgment, contact us at{" "}
        <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${supportEmail}`}>
          {supportEmail}
        </a>
        .
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">USER ACKNOWLEDGMENT</h2>
      <p>
        By clicking &quot;I Understand and Begin,&quot; you confirm that you have read and understood this
        acknowledgment and that you are voluntarily participating in the NxtStps pilot program with full
        awareness that the platform is an MVP in active development.
      </p>

      <p className="text-sm text-[var(--color-muted)] pt-4">
        NxtStps, LLC · Chicago, Illinois · nxtstps.com · Confidential and Proprietary
      </p>
    </div>
  );
}
