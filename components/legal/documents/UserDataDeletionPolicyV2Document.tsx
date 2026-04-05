import {
  getPrivacyMailingAddress,
  getPrivacyPolicyEmail,
} from "@/lib/legal/platformLegalConfig";

const EFFECTIVE_DATE = "April 5, 2026";
const LAST_UPDATED = "April 5, 2026";

/** User Data Deletion Policy v2.0 — informational (no clickwrap). */
export function UserDataDeletionPolicyV2Document() {
  const privacyEmail = getPrivacyPolicyEmail();
  const mailing = getPrivacyMailingAddress();

  return (
    <div
      className="space-y-6 text-base leading-relaxed text-[var(--color-charcoal)]"
      style={{ fontSize: "max(1rem, 16px)" }}
    >
      <header className="space-y-3 border-b border-[var(--color-border-light)] pb-6">
        <p className="text-xl font-bold text-[var(--color-navy)]">NXTSTPS, LLC — USER DATA DELETION POLICY</p>
        <p className="text-sm text-[var(--color-slate)]">
          Effective Date: {EFFECTIVE_DATE} · Last Updated: {LAST_UPDATED} · Version: 2.0
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">1 — PURPOSE</h2>
        <p>
          NxtStps is committed to protecting the privacy, dignity, and autonomy of every person who uses the
          platform — particularly victims of crime accessing sensitive support services at a difficult time in
          their lives.
        </p>
        <p>This User Data Deletion Policy explains:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>what data NxtStps holds about you</li>
          <li>how you can request deletion of your account and data</li>
          <li>how deletion is executed and confirmed</li>
          <li>what data may be retained and why</li>
          <li>what happens to retained data after a deletion request</li>
        </ul>
        <p>
          This Policy applies to all registered NxtStps users. It is published on the platform so that every
          user can understand their rights before, during, and after using the platform. It is part of a
          broader set of privacy commitments described in the NxtStps Privacy Policy, which governs how data
          is collected, used, and protected. This Policy and the Privacy Policy should be read together.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">2 — SCOPE</h2>
        <p>This Policy covers all personal data collected and stored by NxtStps, including:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Conversational intake responses and application form data</li>
          <li>
            Uploaded documents and attachments — police reports, medical records, financial records, and
            supporting evidence
          </li>
          <li>Account profile information — name, contact details, login credentials</li>
          <li>Application drafts, completed applications, and submission records</li>
          <li>Communication logs between the user and the platform</li>
          <li>AI interaction logs and completeness assessment records</li>
          <li>Consent and compliance records</li>
          <li>Technical session metadata</li>
        </ul>
        <p>
          This Policy applies to all systems operated by NxtStps, including production databases, backup
          systems, AI processing environments, and third-party service providers acting as data subprocessors.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">3 — WHO CAN REQUEST DELETION</h2>
        <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.1 Applicants</h3>
        <p>
          Applicants — victims or survivors who access the platform directly — may request deletion of their
          personal account and all associated data at any time. No justification is required. Deletion is a
          right, not a privilege.
        </p>
        <p>Deletion requests may be submitted through:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            The in-platform account settings — &quot;Delete My Account&quot; — available from any screen
          </li>
          <li>
            Written request to NxtStps at{" "}
            <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
              {privacyEmail}
            </a>{" "}
            from the email address registered to the account
          </li>
          <li>Assisted deletion facilitated by an authorized advocate who has documented written consent from the Applicant</li>
        </ul>
        <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-3">3.2 Provider users</h3>
        <p>
          Provider users — advocates, case managers, and administrative staff — may request deletion of their
          own individual staff account and credentials at any time. A Provider user&apos;s account deletion does
          not delete the Applicant case data associated with their caseload. That data belongs to the
          Applicants they served and can only be deleted by those Applicants or by the Organization&apos;s
          designated administrator acting with documented Applicant consent.
        </p>
        <p>
          An Organization&apos;s designated administrator may submit bulk deletion requests on behalf of the
          Organization in the event the Organization terminates its licensing agreement with NxtStps. Bulk
          organizational deletion requests are governed by the Organization&apos;s licensing agreement and are
          processed under the same timelines as individual requests.
        </p>
        <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-3">3.3 Authorized Representatives</h3>
        <p>
          A parent, legal guardian, executor, or other authorized representative may submit a deletion
          request on behalf of an Applicant who is a minor, incapacitated, or deceased. Authorized
          representatives must provide documentation of their authority — such as guardianship papers, power of
          attorney, or letters testamentary — before NxtStps will process a deletion request on another
          person&apos;s behalf.
        </p>
        <p>
          NxtStps recognizes that many Applicants on this platform are trauma survivors who may not have
          standard forms of identification. NxtStps will make reasonable accommodations for identity
          verification and will not automatically deny deletion requests because a user cannot provide standard
          documentation. If you are unable to complete standard verification, contact NxtStps at{" "}
          <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
            {privacyEmail}
          </a>{" "}
          to discuss alternative verification methods.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">4 — TYPES OF DELETION</h2>
        <h3 className="text-base font-medium text-[var(--color-charcoal)]">4.1 Standard Account Deletion</h3>
        <p>
          Upon confirmation of identity and absence of any legal hold, NxtStps will permanently delete:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>User profile information including name, contact details, and demographic data</li>
          <li>All conversational intake responses and form data</li>
          <li>
            All uploaded documents and associated derived artifacts — OCR extractions, previews, and metadata
          </li>
          <li>Application drafts and incomplete submissions</li>
          <li>Completed application records, subject to the retention exceptions in Section 5</li>
          <li>Communication logs between the user and the platform</li>
          <li>AI interaction logs, subject to the minimum audit retention requirement in Section 5</li>
        </ul>
        <p>
          NxtStps will also revoke all authentication credentials, invalidate all active sessions, and
          permanently disable access to the account.
        </p>
        <p>
          Deletion is irreversible once completed. Accounts cannot be restored. Data cannot be recovered after
          deletion is finalized. If you return to the platform after deleting your account, you must create a
          new account.
        </p>
        <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-3">4.2 Immediate Safety Deletion</h3>
        <p>
          If a user expresses fear, distress, or safety concerns — including concern that an abusive partner or
          other unauthorized person may attempt to access their account or data — NxtStps will process
          deletion immediately without requiring standard verification procedures or waiting periods, subject
          only to the minimum technical requirements of the deletion process.
        </p>
        <p>Immediate Safety Deletion includes:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>No retention of data beyond the minimum technically required to complete the deletion process</li>
          <li>No follow-up contact from NxtStps after deletion unless explicitly requested by the user</li>
          <li>No attempt by NxtStps to persuade the user to retain their account or reconsider</li>
          <li>Immediate session invalidation and authentication revocation</li>
        </ul>
        <p>
          The Exit Safely button available on every platform screen initiates session clearing and immediate
          navigation away from the platform. For complete account and data deletion, submit a deletion
          request through account settings or by email as described in Section 3.1.
        </p>
        <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-3">4.3 Partial Deletion</h3>
        <p>
          Where a legal hold prevents full deletion of all data, NxtStps will execute maximum deletion —
          deleting everything that can legally be deleted — and anonymize or restrict access to the minimum
          data that must be retained. The legal hold decision process is described in Appendix A.
        </p>
      </section>

      <RetentionTableSection />

      <AnonymizationSection />

      <TimelineSection />

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">8 — THIRD-PARTY SUBPROCESSORS</h2>
        <p>NxtStps requires all subprocessors — cloud hosting providers, document processing services, AI service providers, security monitoring services, and communication providers — to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Adhere to deletion standards equivalent to or more stringent than those described in this Policy</li>
          <li>Receive and process deletion propagation requests within the 30-day timeline</li>
          <li>Provide written confirmation to NxtStps that deletion has been completed</li>
          <li>Be contractually prohibited from retaining deleted user data for any purpose after receiving a deletion request</li>
        </ul>
        <p>
          If a subprocessor fails to confirm deletion within the required timeline, NxtStps will treat this as
          a security incident, escalate within 24 hours, and notify the user of the delay and the steps being
          taken to resolve it.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">9 — ACCOUNT RECOVERY AFTER DELETION</h2>
        <p>Once deletion is completed and confirmed:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>The account cannot be restored under any circumstances</li>
          <li>Deleted data cannot be recovered by NxtStps, the user, or any third party</li>
          <li>The email address associated with the deleted account may be reused to create a new account if the user returns to the platform</li>
          <li>Prior application data, case history, and document uploads will not be available in a new account</li>
        </ul>
        <p>
          If you need access to documents you previously uploaded — for example, to share them with another
          service provider — please download and save copies before requesting deletion. NxtStps cannot provide
          access to deleted data after deletion is confirmed.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">10 — ORGANIZATIONAL ACCOUNT CLOSURE</h2>
        <p>When an Organization terminates its licensing agreement with NxtStps, the following process applies:</p>
        <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-2">10.1 Staff Account Deletion</h3>
        <p>
          All Provider user accounts — advocate logins, administrator access, staff credentials — are
          deactivated immediately upon agreement termination and permanently deleted within 30 days.
        </p>
        <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-2">10.2 Applicant Case Data</h3>
        <p>
          Applicant case data held within an Organization&apos;s account is not automatically deleted when the
          Organization terminates. Applicants retain their data rights regardless of the Organization&apos;s
          status. NxtStps will:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>(a) notify affected Applicants that the Organization has ended its relationship with NxtStps;</li>
          <li>(b) provide Applicants with a 90-day window to download their data or transfer it;</li>
          <li>(c) process deletion requests from Applicants received during that window under the standard timeline; and</li>
          <li>(d) retain or delete remaining data in accordance with the retention schedule in Section 5 after the 90-day window closes.</li>
        </ul>
        <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-2">10.3 Organizational Data</h3>
        <p>
          Organizational-level data — billing records, licensing agreements, administrator contact information,
          and compliance records — is retained for 7 years after agreement termination for legal and audit
          purposes, then permanently destroyed.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">11 — CHANGES TO THIS POLICY</h2>
        <p>
          NxtStps may update this Policy to reflect changes in applicable law, platform architecture, or data
          governance best practices. We will notify users of material changes by posting a notice through the
          platform and by email to registered addresses at least 15 days before changes take effect. This
          notification standard is consistent with the amendment mechanism described in the NxtStps Terms of
          Use and Privacy Policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">12 — CONTACT INFORMATION</h2>
        <p>For deletion requests, questions about this Policy, or to check the status of a pending deletion request:</p>
        <p className="mt-2">
          NxtStps, LLC
          <br />
          Attention: Privacy
          <br />
          {mailing}
          <br />
          Chicago, Illinois
          <br />
          Email:{" "}
          <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
            {privacyEmail}
          </a>
          <br />
          Website: nxtstps.com
        </p>
        <p className="mt-2">NxtStps will acknowledge all deletion requests within 5 business days of receipt.</p>
      </section>

      <AppendixA />

      <p className="text-sm text-[var(--color-muted)] pt-4">
        NxtStps, LLC · Chicago, Illinois · nxtstps.com · Confidential and Proprietary
      </p>
    </div>
  );
}

function RetentionTableSection() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        5 — DATA THAT MAY BE RETAINED AFTER A DELETION REQUEST
      </h2>
      <p>
        NxtStps retains only the minimum data required by law or operational necessity. The following table
        defines what may be retained, why, and for how long. All retention periods are consistent with the
        NxtStps Privacy Policy retention schedule.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border-light)]">
        <table className="w-full min-w-[320px] border-collapse text-left text-sm">
          <caption className="sr-only">Retention after deletion request by data category</caption>
          <thead>
            <tr className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)]">
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Data Category
              </th>
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Standard Retention After Deletion Request
              </th>
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Legal Basis
              </th>
            </tr>
          </thead>
          <tbody className="text-[var(--color-charcoal)]">
            {[
              [
                "Account credentials and profile information",
                "90 days post-deletion (for technical deactivation confirmation), then permanently destroyed",
                "Operational necessity",
              ],
              [
                "Application and case data — submitted applications",
                "7 years from submission date",
                "State CVC recordkeeping requirements and federal records standards",
              ],
              [
                "Application and case data — active, unsubmitted",
                "Deleted immediately upon request",
                "No legal hold applies to unsubmitted drafts",
              ],
              [
                "Uploaded documents",
                "7 years from upload date, or as required by specific program rules",
                "State and federal records retention",
              ],
              [
                "Consent and compliance records — ToU, Privacy Policy, Waiver acceptances",
                "7 years from acceptance date",
                "Legal enforceability of consent records",
              ],
              ["Technical and device logs", "12 months maximum, then purged", "Security monitoring and incident investigation"],
              ["AI interaction logs", "24 months maximum, then purged", "Bias auditing and compliance requirements"],
              ["Security and audit logs — access records, deletion events", "7 years", "SOC 2 compliance and legal defense"],
              [
                "Aggregated, fully anonymized analytics data",
                "Indefinite — not subject to deletion because no individual can be identified",
                "Platform improvement",
              ],
            ].map((row) => (
              <tr key={row[0]} className="border-b border-[var(--color-border-light)] last:border-b-0">
                <td className="p-3 align-top">{row[0]}</td>
                <td className="p-3 align-top">{row[1]}</td>
                <td className="p-3 align-top">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4">
        <strong>Key principle:</strong> Retained data is held in restricted, access-logged storage and is never
        used for secondary purposes — no analytics, no AI training, no commercial use of any kind. NxtStps will
        notify the user in plain language of exactly what was retained and why at the time of deletion
        confirmation.
      </p>
    </section>
  );
}

function AnonymizationSection() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">6 — ANONYMIZATION STANDARDS</h2>
      <p>
        Where deletion of specific data is not legally permissible, NxtStps will anonymize that data to the
        maximum extent permitted by applicable law. Anonymization means:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Removal of all direct identifiers — name, address, phone number, email, government-issued identifiers</li>
        <li>Replacement of all unique identifiers with non-reversible cryptographic hashes</li>
        <li>Removal of all uploaded documents and narrative content</li>
        <li>Stripping of all metadata from remaining records — timestamps, file names, EXIF data</li>
        <li>Verification that remaining data cannot be re-linked to the individual through any reasonable means</li>
      </ul>
      <p>Anonymized data is used solely for:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Platform performance evaluation and system reliability monitoring</li>
        <li>Aggregate, non-individualized compliance reporting</li>
        <li>Statistical analysis to improve the accuracy of the rules engine and completeness validation</li>
      </ul>
      <p>
        Anonymization is not a substitute for deletion. NxtStps treats anonymization as the last resort when
        deletion is legally prohibited and applies it as aggressively as the law permits.
      </p>
    </section>
  );
}

function TimelineSection() {
  const rows = [
    ["Deletion request received and logged", "Immediate — automated confirmation"],
    ["Acknowledgment sent to user", "Within 5 business days"],
    ["Identity verification completed (if required)", "Within 10 business days of receiving verification information"],
    ["Legal hold assessment completed", "Within 15 business days"],
    ["Full deletion executed across primary systems", "Within 30 days of confirmed request"],
    ["Subprocessor deletion propagation", "Within 30 days"],
    ["Backup system purge", "Next scheduled rotation, maximum 90 days"],
    ["Final deletion confirmation sent to user", "Within 30 days of completion"],
  ];
  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">7 — PROCESSING TIMELINE</h2>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border-light)]">
        <table className="w-full min-w-[280px] border-collapse text-left text-sm">
          <caption className="sr-only">Deletion processing timeline</caption>
          <thead>
            <tr className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)]">
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Step
              </th>
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Timeline
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([step, time]) => (
              <tr key={step} className="border-b border-[var(--color-border-light)] last:border-b-0">
                <td className="p-3 align-top">{step}</td>
                <td className="p-3 align-top">{time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4">
        The 30-day standard satisfies NxtStps&apos;s 45-day data rights response commitment stated in the
        Privacy Policy. NxtStps will notify the user within the initial 30-day period if additional time is
        required and will provide a plain-language explanation of the reason for any delay.
      </p>
    </section>
  );
}

function AppendixA() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">APPENDIX A — LEGAL HOLD DECISION TREE</h2>
      <p>
        This decision tree explains the process NxtStps uses to determine whether a deletion request can be
        fully executed, must be partially limited, or must be temporarily delayed due to legal obligations.
        NxtStps publishes this decision tree so that users understand exactly how deletion decisions are made —
        there are no hidden criteria.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">A.1 What Triggers the Decision Tree</h3>
      <p>The decision tree runs automatically whenever a deletion request is received from:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>A user through in-platform account settings</li>
        <li>A verified written request by email</li>
        <li>An authorized representative with documented authority</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-2">A.2 The Decision Process</h3>
      <div className="space-y-4 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/40 p-4 text-sm leading-relaxed">
        <p>
          <strong>STEP 1 — Identity Verification</strong>
          <br />
          Can the requester&apos;s identity be reasonably verified?
          <br />
          <em>NO</em> → Deletion is paused. NxtStps contacts the requester to request verification. No data is
          processed until verification is completed or waived under the Immediate Safety Deletion provision.
          NxtStps will work with users who cannot provide standard identification to find an alternative
          verification method.
          <br />
          <em>YES</em> → Proceed to Step 2.
        </p>
        <p>
          <strong>STEP 2 — Legal Hold Assessment</strong>
          <br />
          Is any portion of the user&apos;s data subject to a mandatory retention requirement?
          <br />
          Legal hold examples include: a crime victim compensation application already submitted where state
          recordkeeping requires retention; an open state or county audit window; a lawful subpoena, court order,
          or formal agency records request; an active fraud or misuse investigation.
          <br />
          <em>NO</em> — Proceed to Step 5 (Full Deletion).
          <br />
          <em>YES</em> — Proceed to Step 3.
        </p>
        <p>
          <strong>STEP 3 — Anonymization Assessment</strong>
          <br />
          Does the governing statute or regulation permit anonymization in place of retention of identifiable
          data?
          <br />
          <em>YES</em> → Step 4 (Partial Deletion with Anonymization).
          <br />
          <em>NO</em> → Step 4A (Restricted Retention).
        </p>
        <p>
          <strong>STEP 4 — Partial Deletion with Anonymization</strong>
          <br />
          NxtStps deletes everything that can be legally deleted and anonymizes the minimum data that must be
          retained. What gets deleted: user-controlled data, uploaded documents, narrative content,
          conversational transcripts, contact information, and any data not subject to the legal hold. What may
          be anonymized and retained (examples): submission timestamp; program identifier; application status
          outcome code. What is explicitly removed from anonymized records: names, addresses, contact
          information, narrative descriptions, uploaded documents, conversational transcripts, and all direct
          identifiers. Proceed to Step 6.
        </p>
        <p>
          <strong>STEP 4A — Restricted Retention (Anonymization Not Permitted)</strong>
          <br />
          Where the governing statute requires retention of identifiable data without permitting anonymization,
          NxtStps retains legally required data in a restricted, access-logged vault; deletes all data not
          subject to the specific legal hold; locks retained records against secondary use; applies role-based
          access controls and immutable audit logging. Proceed to Step 6.
        </p>
        <p>
          <strong>STEP 5 — Full Deletion</strong>
          <br />
          No legal hold applies. NxtStps executes complete deletion across all systems, propagates deletion to
          subprocessors, and schedules backup purge on the next rotation within 90 days. Proceed to Step 6.
        </p>
        <p>
          <strong>STEP 6 — User Notification</strong>
          <br />
          NxtStps sends written confirmation including: deletion executed or scheduled; plain-language description
          of any retained data, why, and how long; legal basis in non-lawyer language; contact information for
          questions.
        </p>
        <p>
          <strong>STEP 7 — Legal Hold Expiry Monitoring</strong>
          <br />
          Where data was retained under a legal hold, NxtStps monitors for expiration and executes final
          deletion when the hold ends without requiring additional user action.
        </p>
      </div>
      <h3 className="text-base font-medium text-[var(--color-charcoal)] pt-2">A.3 Governing Principle</h3>
      <p>
        Where there is any ambiguity about whether data must be retained or may be deleted, NxtStps defaults to
        user protection and data minimization. We delete more, not less, when the law is unclear.
      </p>
    </section>
  );
}
