import Link from "next/link";
import {
  getCookieManagementHelpUrl,
  getLegalSupportEmail,
  getPrivacyPolicyEmail,
} from "@/lib/legal/platformLegalConfig";

const EFFECTIVE_DATE = "April 5, 2026";
const LAST_UPDATED = "April 5, 2026";

/** Full Privacy Policy v2.0 for consent scroll and /privacy. */
export function PrivacyPolicyV2Document() {
  const privacyEmail = getPrivacyPolicyEmail();
  const legalEmail = getLegalSupportEmail();
  const cookieHelpUrl = getCookieManagementHelpUrl();

  return (
    <div className="space-y-6 text-base leading-relaxed text-[var(--color-charcoal)]">
      <header className="space-y-3 border-b border-[var(--color-border-light)] pb-6">
        <p className="text-xl font-bold text-[var(--color-navy)]">NXTSTPS, LLC — PRIVACY POLICY</p>
        <p className="text-sm text-[var(--color-slate)]">
          Effective Date: {EFFECTIVE_DATE} · Last Updated: {LAST_UPDATED} · Version: 2.0
        </p>
      </header>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 1 — INTRODUCTION AND SCOPE
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.1 About This Policy</h3>
      <p>
        This Privacy Policy (&quot;Policy&quot;) describes how NxtStps, LLC, an Illinois limited
        liability company (&quot;NxtStps,&quot; &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot;
        or &quot;our&quot;) collects, uses, processes, retains, protects, and discloses personal
        information obtained through the NxtStps platform, website, and all related services
        (collectively, the &quot;Platform&quot;).
      </p>
      <p>This Policy is drafted to comply with federal, state, and local confidentiality mandates applicable to applicant services, including but not limited to:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>The Victims of Crime Act of 1984 (VOCA) and its implementing regulations</li>
        <li>The Violence Against Women Act (VAWA), specifically Section 40002(b)(2)</li>
        <li>The Illinois Personal Information Protection Act (815 ILCS 530/)</li>
        <li>The Illinois Biometric Information Privacy Act (740 ILCS 14/) — see Section 6.8</li>
        <li>HIPAA-adjacent standards applicable to health-related victim information</li>
        <li>CJIS standards applicable to criminal justice information</li>
        <li>Industry security frameworks including NIST and SOC 2</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.2 Scope</h3>
      <p>
        This Policy applies to: (a) all users of the Platform across all three account types —
        Applicants, Providers, and Administering Agencies — as defined in the Terms of Use; (b) all
        personal information collected, processed, or stored by NxtStps through the Platform; (c) all
        interactions with the Platform, including AI-assisted functionality; and (d) all data
        submitted by Provider users on behalf of Applicants.
      </p>
      <p>This Policy does not apply to:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Information handled by third-party agencies, state administering offices, or external
          entities after User-directed submission;
        </li>
        <li>Offline interactions not expressly included in these provisions;</li>
        <li>
          Data practices of third-party services that users access independently through links on the
          Platform.
        </li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.3 Acceptance</h3>
      <p>
        By affirmatively accepting this Policy through the Platform&apos;s clickwrap consent
        mechanism, you acknowledge and agree to the collection and handling of information as
        described herein. Passive use of the Platform does not constitute acceptance.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        1.4 Data Controller and Processor Roles
      </h3>
      <p>
        NxtStps acts in different roles depending on the context in which it processes personal
        information, and those roles carry different legal responsibilities.
      </p>
      <p>
        <strong>NxtStps as Data Controller:</strong> When NxtStps determines the purposes and means of
        processing personal information — such as when it collects account credentials, processes
        consent records, or generates audit logs — NxtStps acts as the data controller responsible for
        that processing under applicable law. This Policy describes NxtStps&apos;s practices in its
        role as data controller.
      </p>
      <p>
        <strong>NxtStps as Data Processor:</strong> When an Organization holds a licensing agreement
        with NxtStps and its advocates use the Platform to enter and manage case data on behalf of
        Applicants, NxtStps acts as a data processor on behalf of that Organization. In those
        circumstances the Organization is the data controller responsible for the Applicant&apos;s
        data, and the Organization&apos;s own privacy obligations — including obligations under VOCA,
        VAWA, and applicable state law — apply to that data. NxtStps processes such data only on the
        Organization&apos;s instructions and in accordance with its data processing agreement with
        that Organization.
      </p>
      <p>
        If you have questions about how an Organization has processed your data through NxtStps:
        Contact the Organization directly. NxtStps will refer any Applicant inquiry about
        Organizationally-controlled data to the relevant Organization unless required by law to
        respond directly.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 2 — TWO TYPES OF USERS AND THEIR DATA
      </h2>
      <p>
        NxtStps serves two distinct user populations whose data relationships with the Platform are
        different.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">2.1 Applicants</h3>
      <p>
        Applicants are victims or survivors of crime, or their authorized representatives, who access
        the Platform directly to prepare compensation applications. Applicants are the primary
        beneficiaries of the Platform&apos;s data collection — every field collected exists to support
        their compensation claim, not to profile them as individuals.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">2.2 Providers</h3>
      <p>
        Providers are advocates, case managers, and administrative staff who access the Platform
        through an institutional account to assist Applicants. Provider users may enter, upload, and
        manage case data on behalf of Applicants. When a Provider user enters data on behalf of an
        Applicant, that data belongs to the Applicant, not to the organization or the Provider user.
        Provider users may not request deletion of an Applicant&apos;s personal data — only the
        Applicant may exercise that right.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">2.3 Administering Agencies</h3>
      <p>
        Administering Agency users access the Platform to review applications, generate compliance
        reports, and fulfill oversight obligations. Administering Agency users have read access to
        application data within their jurisdiction scope, limited to what is necessary for program
        administration and determination functions. They do not have access to intake communications or
        case notes beyond what is required for their program oversight role.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        2.4 Organizational Administrator Control
      </h3>
      <p>
        Within an Organization&apos;s account, a designated administrator controls access permissions,
        role assignments, and user management. The administrator may grant or revoke access for
        individual staff members, configure which cases each advocate can access, and manage
        organizational data settings. If an administrator changes your access rights, you may lose
        access to information associated with the organizational account. NxtStps is not responsible
        for access decisions made by an Organization&apos;s administrator. If you believe your access
        has been incorrectly configured, contact your Organization&apos;s administrator directly.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        2.5 Data Entered on Behalf of Others
      </h3>
      <p>
        If you are a Provider user who enters information on behalf of an Applicant, you represent
        that: (a) you are authorized to act on that Applicant&apos;s behalf; (b) you have obtained any
        required consent from the Applicant to enter their information; and (c) you will handle all
        information in compliance with VOCA, VAWA, and applicable state confidentiality statutes.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 3 — CATEGORIES OF INFORMATION COLLECTED
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.1 Personal Identifiers</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>Full name, address, phone number, email address</li>
        <li>Government-issued identifiers, where provided by User</li>
        <li>Account credentials and authentication information</li>
        <li>Date of birth, where required for eligibility pre-screening</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        3.2 Sensitive Personal Information
      </h3>
      <p>
        Given the nature of applicant services, Users may provide the following categories of sensitive
        information in the course of completing a crime victim compensation application:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Details of victimization, trauma, or violent incident</li>
        <li>Criminal incident information and police report data</li>
        <li>Medical, psychological, or behavioral health information</li>
        <li>Financial hardship information, including income and loss documentation</li>
        <li>Relationship or dependency status</li>
        <li>Immigration status, where relevant to program eligibility</li>
        <li>Information about minors in the household</li>
      </ul>
      <p>
        NxtStps does not solicit sensitive information beyond what is required for the crime victim
        compensation application process. Users voluntarily provide this information as part of
        completing their application.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        3.3 Application and Documentation Information
      </h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>Completed form responses</li>
        <li>
          Uploaded supporting documents including police reports, medical records, and financial
          records
        </li>
        <li>Written statements or narratives</li>
        <li>Document metadata including file type, size, and upload timestamp</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        3.4 Technical and Device Information
      </h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>IP address</li>
        <li>Device type and operating system</li>
        <li>Browser type and version</li>
        <li>Access timestamps</li>
        <li>Session metadata and usage logs</li>
        <li>Referral source and navigation path within the Platform</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.5 AI Interaction Data</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>Inputs, queries, and responses submitted to AI-assisted features</li>
        <li>AI-generated outputs and completeness assessments</li>
        <li>Logs associated with automated system activity, retained for audit and compliance purposes</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        3.6 Consent and Compliance Records
      </h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Records of your acceptance of these Terms, the Terms of Use, and the Liability Waiver,
          including the version accepted, timestamp, IP address, and device information
        </li>
        <li>Records of any withdrawal of consent or deletion requests</li>
      </ul>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 4 — SOURCES OF INFORMATION
      </h2>
      <p>Information may be collected from the following sources:</p>
      <p>
        (a) Direct User submission — information you enter, upload, or transmit through the
        Platform; (b) Automated system metadata — technical information generated automatically when you
        access the Platform; (c) Cookies and similar technologies — session data and usage analytics as
        described in Section 6; (d) Organizational administrators — configuration and access
        information provided by your Organization&apos;s administrator when setting up your account; (e)
        Integration sources — where you authorize the Platform to retrieve information from connected
        third-party systems such as police records portals or document repositories, information
        retrieved through those integrations.
      </p>
      <p>
        NxtStps does not purchase, obtain, or use consumer data from commercial data brokers, credit
        reporting agencies, or advertising data providers.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 5 — SURVIVOR SAFETY AND CONFIDENTIALITY
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        5.1 VAWA Confidentiality Requirements
      </h3>
      <p>
        NxtStps complies with the confidentiality requirements of the Violence Against Women Act.
        VAWA Section 40002(b)(2) prohibits the disclosure of personally identifying information about
        any individual seeking services from a VAWA-funded program without informed, written, reasonably
        time-limited consent. NxtStps will not disclose individually identifying information about
        victims of domestic violence, sexual assault, stalking, or trafficking without the applicant&apos;s
        informed written consent, except as compelled by a court order that complies with VAWA&apos;s
        confidentiality provisions.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">5.2 Survivor Safety Mode</h3>
      <p>
        The Platform includes a survivor safety mode accessible from any screen. Activating survivor
        safety mode immediately: (a) clears the current session from the browser; (b) routes to a
        neutral external website; and (c) does not save any information entered during that session.
        Users in dangerous situations are encouraged to use this feature. Instructions for activating
        survivor safety mode are displayed prominently on every Platform screen without requiring the
        user to scroll.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        5.3 No Disclosure to Abusers or Unauthorized Parties
      </h3>
      <p>
        NxtStps will not disclose an applicant&apos;s use of the Platform, their application status, their
        location, or any personally identifying information to any person who is not authorized by the
        victim to receive that information. This prohibition applies regardless of any relationship
        between the requesting party and the applicant, including family members, intimate partners, or
        legal representatives who have not been authorized by the applicant.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">5.4 Shared Device Safety</h3>
      <p>
        NxtStps recommends that Users accessing the Platform on a shared or family device: (a) use a
        private or incognito browsing window; (b) clear browser history after each session; and (c) log
        out of the Platform immediately after each use. The Platform automatically logs out sessions
        after a defined period of inactivity. NxtStps does not use persistent tracking cookies that
        would allow detection of Platform use across devices or sessions on shared devices.
      </p>

      <PrivacyPolicyV2SectionsPart2
        privacyEmail={privacyEmail}
        legalEmail={legalEmail}
        cookieHelpUrl={cookieHelpUrl}
      />
    </div>
  );
}

function PrivacyPolicyV2SectionsPart2(props: {
  privacyEmail: string;
  legalEmail: string;
  cookieHelpUrl: string;
}) {
  const { privacyEmail, legalEmail, cookieHelpUrl } = props;
  return (
    <>
      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 6 — COOKIES, TRACKING TECHNOLOGIES, AND WHAT WE DO NOT DO
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.1 Cookies We Use</h3>
      <p>NxtStps uses the following types of cookies and similar technologies:</p>
      <p>
        <strong>Session cookies</strong> — temporary cookies that expire when you close your browser.
        Used to maintain your login state and session continuity while you are actively using the
        Platform. These are essential to Platform operation and cannot be disabled without preventing
        access.
      </p>
      <p>
        <strong>Security cookies</strong> — used to support multi-factor authentication, detect unusual
        activity, and protect against unauthorized access. These are essential to Platform security
        and cannot be disabled without preventing access to the Platform.
      </p>
      <p>
        <strong>Analytics cookies</strong> — used to collect aggregate, anonymized information about
        how Users navigate the Platform, which features are used most frequently, and where errors
        occur. This information is used to improve the Platform. No individually identifying information
        is collected through analytics cookies. Analytics data is processed by NxtStps internally and is
        not shared with external advertising or analytics networks.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.2 Cookies We Do Not Use</h3>
      <p>NxtStps does not use:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Advertising, marketing, or retargeting cookies of any kind</li>
        <li>Cross-site tracking pixels or beacons that follow users across other websites</li>
        <li>Third-party behavioral analytics that share data with advertising networks or data brokers</li>
        <li>
          Fingerprinting or persistent device identification technology beyond what is required for
          security
        </li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        6.3 Session Replay and Keystroke Logging
      </h3>
      <p>
        NxtStps does not use session replay technology, screen recording software, keystroke logging, or
        any tool that records or replays Applicant interactions with the Platform. Given the sensitive
        nature of the information entered by trauma survivors on the Platform, these technologies are
        incompatible with NxtStps&apos;s commitment to user safety and privacy and will not be deployed.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        6.4 Email Communication Tracking
      </h3>
      <p>
        NxtStps sends security notifications, case status updates, and account communications to Users.
        NxtStps does not use tracking pixels, clear GIFs, or similar technologies in its email
        communications to monitor whether emails are opened, forwarded, or clicked. Email communications
        from NxtStps are functional communications only — they are not used for behavioral analytics or
        marketing measurement.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        6.5 Interest-Based Advertising
      </h3>
      <p>
        NxtStps does not engage in interest-based advertising, behavioral targeting, or any form of
        commercial advertising directed at Platform users. NxtStps does not share user data with
        advertising networks, demand-side platforms, or any commercial advertising infrastructure.
        NxtStps does not display third-party advertisements within the Platform.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        6.6 Global Privacy Control Signal
      </h3>
      <p>
        NxtStps honors the Global Privacy Control (GPC) browser signal. Because NxtStps does not
        engage in the sale, sharing, or commercial use of personal data for any purpose, a GPC signal
        from your browser will not change how NxtStps processes your data — we are already operating at
        the highest level of data protection the GPC signal is designed to enforce. If you have enabled
        GPC on your browser, NxtStps will treat this as confirmation of your preference for maximum
        data privacy.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.7 Cookie Management</h3>
      <p>
        You may configure your browser to refuse or delete non-essential cookies. Disabling session or
        security cookies will prevent you from accessing the Platform. Disabling analytics cookies will
        not affect your ability to use the Platform. Instructions for managing cookies in common browsers
        are available at{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={cookieHelpUrl}>
          this cookie management resource
        </a>
        .
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        6.8 Illinois Biometric Information Privacy Act
      </h3>
      <p>
        NxtStps does not collect biometric identifiers or biometric information as defined under the
        Illinois Biometric Information Privacy Act (740 ILCS 14/), including fingerprints, retina or
        iris scans, voiceprints, face geometry, or hand geometry. If NxtStps introduces any biometric
        functionality in the future, it will update this Policy, provide the written notice required by
        BIPA, and obtain written consent before any biometric collection begins. NxtStps will never
        sell, lease, trade, or profit from biometric information under any circumstances.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 7 — PURPOSES OF INFORMATION PROCESSING
      </h2>
      <p>
        NxtStps processes personal information solely for the following purposes. We do not process
        personal information for any purpose not listed here.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        7.1 Platform Operation and Service Delivery
      </h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>Guiding Users through the crime victim compensation application process</li>
        <li>Facilitating document upload, management, and completeness validation</li>
        <li>Providing AI-assisted guidance and eligibility pre-screening</li>
        <li>Maintaining User accounts and organizational account structures</li>
        <li>Enabling advocate-assisted workflows</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        7.2 Compliance with Legal Requirements
      </h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>VOCA and VAWA confidentiality compliance</li>
        <li>State-level victim confidentiality statutes</li>
        <li>SOC 2 audit logging requirements</li>
        <li>Illinois data breach notification obligations</li>
        <li>Federal and state records retention requirements</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        7.3 Security, Fraud Prevention, and Audit Logging
      </h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>Maintaining system integrity and availability</li>
        <li>Detecting and responding to unauthorized access</li>
        <li>Generating and retaining immutable audit logs for compliance review</li>
        <li>Supporting security incident investigation</li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        7.4 Platform Improvement — Restricted Use Only
      </h3>
      <p>
        NxtStps may use aggregate, anonymized, and de-identified data — data from which no Applicant
        can be identified — for: platform performance optimization; rules engine accuracy improvement;
        AI safety and bias monitoring; compliance reporting and analytics. No individually identifying
        information is used for platform improvement purposes. No identifiable victim information is ever
        used to train AI models, develop commercial data products, or share with external partners for
        research purposes.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 8 — WHAT WE WILL NEVER DO
      </h2>
      <p>
        NxtStps operates in a domain where trust is not optional — it is the foundation of every
        relationship the platform has with victims, advocates, and agencies. The following prohibitions
        are absolute and unconditional. They are not subject to change, exception, or override by any
        business consideration.
      </p>
      <p>NxtStps will never:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          (a) <strong>Sell, rent, or license personal data.</strong> NxtStps will never sell, rent,
          license, or otherwise transfer personal information to any third party for commercial
          purposes, compensation, or business value of any kind. This prohibition applies to all
          personal information including aggregate and de-identified data derived from victim
          information.
        </li>
        <li>
          (b) <strong>Use data for advertising.</strong> NxtStps will never use personal information —
          including usage data, behavioral data, or device data — for advertising, marketing targeting,
          or commercial profiling of any kind directed at Platform users or any other population.
        </li>
        <li>
          (c) <strong>Train AI on identifiable victim data.</strong> NxtStps will never use individually
          identifiable information about victims, their cases, their trauma histories, or their
          application details to train, fine-tune, evaluate, or improve any artificial intelligence or
          machine learning model, whether internal or operated by a third party.
        </li>
        <li>
          (d) <strong>Share data with credit bureaus or commercial financial institutions.</strong> NxtStps
          will never share personal information with credit bureaus, consumer reporting agencies,
          financial data brokers, or commercial lending institutions for any purpose.
        </li>
        <li>
          (e) <strong>Disclose victim identity without authorization.</strong> NxtStps will never
          disclose an applicant&apos;s identity, location, contact information, or use of the Platform to any
          person who has not been specifically authorized by the applicant to receive that information,
          regardless of their relationship to the applicant.
        </li>
        <li>
          (f) <strong>Share data with law enforcement without legal compulsion.</strong> NxtStps will
          never voluntarily share personal information with law enforcement agencies without a valid court
          order, subpoena, or other legal process that complies with applicable victim confidentiality
          protections under VOCA and VAWA.
        </li>
        <li>
          (g) <strong>Use session replay or keystroke logging.</strong> NxtStps will never deploy session
          replay technology, keystroke logging, screen recording, or any tool that captures Applicant
          interactions in a form that can be replayed or reviewed at the individual level.
        </li>
      </ul>

      <PrivacyPolicyV2SectionsPart3 privacyEmail={privacyEmail} legalEmail={legalEmail} />
    </>
  );
}

function PrivacyPolicyV2SectionsPart3(props: { privacyEmail: string; legalEmail: string }) {
  const { privacyEmail, legalEmail } = props;
  return (
    <>
      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 9 — DISCLOSURE OF PERSONAL INFORMATION
      </h2>
      <p>NxtStps will not disclose personal information except in the following limited circumstances:</p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">9.1 User-Directed Submission</h3>
      <p>
        When you direct the Platform to transmit your application materials, documents, or information
        to a state agency, victim compensation program, or other designated recipient, NxtStps
        transmits that information at your explicit direction. NxtStps is not responsible for the data
        practices of any recipient agency after transmission.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        9.2 Organizational Account Sharing
      </h3>
      <p>
        Within an Organization&apos;s account, an authorized advocate or case manager may access the case
        information of Applicants assigned to their caseload. Access is governed by the
        Organization&apos;s role-based permissions configuration. NxtStps does not control which
        individuals within an Organization have access to specific cases — that is governed by the
        Organization&apos;s administrator.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">9.3 Trusted Service Providers</h3>
      <p>
        NxtStps may share information with vendors and service providers who assist in operating the
        Platform — including cloud infrastructure providers, security monitoring services, and
        technology support contractors. All service providers are bound by data processing agreements
        that prohibit them from using NxtStps data for any purpose other than providing services to
        NxtStps and that require them to comply with applicable confidentiality and security standards.
        NxtStps does not share data with advertising service providers, marketing platforms, or commercial
        analytics networks.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">9.4 Legal Requirements</h3>
      <p>
        NxtStps may disclose information when required by a valid court order, subpoena, or statute
        imposing mandatory reporting obligations. For victim-related information protected by VOCA and
        VAWA, NxtStps will comply with all applicable restrictions before making any legally compelled
        disclosure, including seeking to quash or limit any court order that does not comply with
        VAWA&apos;s confidentiality protections and notifying the User of any compelled disclosure to the
        extent permitted by law.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">9.5 Safety and Integrity</h3>
      <p>
        NxtStps may disclose information to the minimum extent necessary to prevent fraud or abuse of
        the Platform, protect the security and integrity of the Platform and its Users, or enforce the
        Terms of Use.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">9.6 Business Transfers</h3>
      <p>
        In the event of a merger, acquisition, restructuring, or sale of assets involving NxtStps,
        personal information held by NxtStps may be transferred to the successor entity. In such
        circumstances, NxtStps will: (a) notify Users of the transfer and the successor entity&apos;s
        identity; (b) ensure the successor is bound to privacy standards at least as protective as this
        Policy; and (c) provide Users with the opportunity to delete their accounts before transfer if
        they choose.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 10 — USER DATA RIGHTS</h2>
      <p>
        Subject to applicable law and the limitations described below, Users have the following rights
        regarding their personal information:
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.1 Right to Access</h3>
      <p>
        You may request a copy of the personal information NxtStps holds about you. NxtStps will respond
        to access requests within 45 days of receipt. If additional time is required, NxtStps will
        notify you within the initial 45-day period.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.2 Right to Correction</h3>
      <p>
        You may request correction of inaccurate or incomplete personal information. Where correction is
        not possible within the Platform&apos;s user interface directly, NxtStps will process correction
        requests within 45 days.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.3 Right to Deletion</h3>
      <p>
        You may request deletion of your personal information by following the procedures described in
        the User Deletion Policy. NxtStps will process deletion requests within 45 days subject to the
        following limitations: (a) information required to be retained by law or court order; (b)
        information subject to a legal hold; and (c) information necessary to complete an active
        compliance or audit obligation. For the full deletion process, see our{" "}
        <Link href="/data-deletion" className="font-medium underline hover:text-[var(--color-navy)]">
          User Data Deletion Policy
        </Link>
        .
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.4 Right to Data Portability</h3>
      <p>
        You may request a copy of your personal information in a commonly used, machine-readable
        format. NxtStps will provide portable data exports within 45 days of a valid request.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.5 Right to Object</h3>
      <p>
        You may object to certain processing activities — specifically, processing that goes beyond what
        is strictly necessary to operate the Platform and deliver services. NxtStps will respond to
        objection requests within 45 days and will cease the objected-to processing unless NxtStps can
        demonstrate a compelling legitimate interest that overrides your rights.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.6 Right to Withdraw Consent</h3>
      <p>
        Where NxtStps processes your information on the basis of consent, you may withdraw that consent
        at any time by contacting NxtStps at{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${legalEmail}`}>
          {legalEmail}
        </a>
        . Withdrawal of consent does not affect the lawfulness of processing that occurred before
        withdrawal. Following withdrawal, NxtStps will cease processing the information for the purpose to
        which consent applied, subject to any legal retention obligations.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.7 Right to Non-Discrimination</h3>
      <p>
        NxtStps will not discriminate against you for exercising any of your data rights. Exercising your
        rights will not result in: denial of services, differences in service quality, different prices
        or rates, or any other adverse treatment. NxtStps will not use the exercise of data rights as a
        factor in any decision affecting your access to or use of the Platform.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.8 Provider User Limitations</h3>
      <p>
        Provider users may exercise the rights above only with respect to their own account and credential
        information. A Provider user may not exercise rights on behalf of an Applicant without that
        Applicant&apos;s explicit written authorization. Rights over Applicant case data are held by the
        Applicant, not by the Organization or the Provider user.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.9 Verification of Identity</h3>
      <p>
        To protect your personal information from unauthorized access or modification, NxtStps may
        require verification of your identity before processing any data rights request. Acceptable forms
        of verification include: logging into your registered Platform account from a recognized device;
        confirming account details on file with NxtStps; providing a government-issued identifier where
        no account exists.
      </p>
      <p>
        NxtStps recognizes that many Users — particularly Applicants who are trauma survivors — may not
        have standard forms of identification or may face barriers to identity verification. NxtStps
        will make reasonable accommodations for Users who cannot provide standard verification and will
        not automatically deny rights requests on that basis. If you are unable to complete standard
        verification, contact NxtStps at{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
          {privacyEmail}
        </a>{" "}
        to discuss alternative verification methods. NxtStps will not use identity verification as a
        mechanism to delay or discourage the exercise of legitimate data rights.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.10 Authorized Agents</h3>
      <p>
        You may designate an authorized agent to submit data rights requests on your behalf. Authorized
        agents may include: a parent or legal guardian acting on behalf of a minor User; a legal guardian
        or conservator acting on behalf of an incapacitated User; an executor or administrator acting on
        behalf of a deceased User&apos;s estate; any adult you have designated in writing to act on your
        behalf.
      </p>
      <p>
        To submit a request through an authorized agent, the agent must provide: (a) a signed written
        statement from you authorizing the agent to act on your behalf, including the specific rights
        the agent is authorized to exercise; or (b) documentation establishing the agent&apos;s legal
        authority — such as a power of attorney, court order, letters testamentary, or guardianship
        documentation.
      </p>
      <p>
        NxtStps may require you to independently verify your own identity before honoring a request
        submitted through an authorized agent, unless the agent has provided documentation establishing
        legal authority that makes independent verification impractical. NxtStps will not deny a rights
        request solely because it was submitted by an authorized agent with proper documentation.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.11 Appeals Process</h3>
      <p>
        If NxtStps declines to take action on a data rights request, NxtStps will notify you in writing
        within the applicable response period and explain the reasons for the denial. You may appeal a
        denial by: (a) submitting a written appeal to{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
          {privacyEmail}
        </a>{" "}
        with the subject line &quot;Privacy Rights Appeal&quot; within 60 days of receiving the denial
        notice; (b) including a description of your original request, the denial you received, and the
        reasons you believe the denial was in error.
      </p>
      <p>
        NxtStps will respond to appeals within 45 days with a written explanation of the outcome. If the
        appeal is denied, NxtStps will provide you with information about contacting the Illinois Attorney
        General&apos;s office or other applicable regulatory authority to submit a complaint. NxtStps will
        not retaliate against any User for submitting an appeal.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.12 How to Submit a Request</h3>
      <p>To exercise any of the rights above, contact NxtStps at:</p>
      <p className="whitespace-pre-line">
        Email:{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
          {privacyEmail}
        </a>
        {"\n"}
        Mail: NxtStps, LLC — Attention: Privacy, [Insert Mailing Address], Chicago, Illinois{"\n"}
        Subject line: &quot;Privacy Rights Request — [type of request]&quot;
      </p>
      <p>
        NxtStps will acknowledge receipt of all privacy rights requests within 5 business days.
      </p>

      <PrivacyPolicyV2SectionsPart4 privacyEmail={privacyEmail} />
    </>
  );
}

function PrivacyPolicyV2SectionsPart4(props: { privacyEmail: string }) {
  const { privacyEmail } = props;
  return (
    <>
      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 11 — DATA RETENTION AND DESTRUCTION
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">11.1 Retention Principles</h3>
      <p>
        NxtStps retains personal information only for as long as necessary to: (a) provide the services
        described in the Terms of Use; (b) comply with applicable legal and regulatory retention
        requirements; (c) fulfill active compliance, audit, or legal hold obligations; or (d) resolve
        disputes and enforce our agreements.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">11.2 Retention Schedule</h3>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border-light)]">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <caption className="sr-only">Data retention schedule by category</caption>
          <thead>
            <tr className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 text-left">
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Data Category
              </th>
              <th scope="col" className="p-3 font-semibold text-[var(--color-navy)]">
                Standard Retention Period
              </th>
            </tr>
          </thead>
          <tbody className="text-[var(--color-charcoal)]">
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Account credentials and profile information</td>
              <td className="p-3">Duration of active account + 90 days post-deletion</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Application and case data — active cases</td>
              <td className="p-3">Duration of active case</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Application and case data — submitted</td>
              <td className="p-3">7 years from submission date (federal records standard)</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Uploaded documents</td>
              <td className="p-3">7 years from upload date or as required by program rules</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Consent and compliance records</td>
              <td className="p-3">7 years from acceptance date</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">Technical and device logs</td>
              <td className="p-3">12 months</td>
            </tr>
            <tr className="border-b border-[var(--color-border-light)]">
              <td className="p-3">AI interaction logs</td>
              <td className="p-3">24 months (required for bias auditing)</td>
            </tr>
            <tr>
              <td className="p-3">Security and audit logs</td>
              <td className="p-3">7 years (required for SOC 2 and compliance review)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">11.3 Legal Holds</h3>
      <p>
        Where NxtStps is subject to a legal obligation to preserve information — including active
        litigation, regulatory investigation, or court order — the standard retention schedule is
        suspended for affected data until the legal hold is released.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">11.4 Secure Destruction</h3>
      <p>
        Upon expiration of the applicable retention period, personal information is irreversibly
        destroyed using industry-standard data sanitization methods that comply with NIST guidelines.
        Destruction is documented and logged for compliance purposes.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 12 — DATA SECURITY SAFEGUARDS
      </h2>
      <p>NxtStps implements the following administrative, technical, and physical safeguards:</p>
      <p>
        <strong>Technical Controls:</strong> AES-256 encryption of data at rest; TLS 1.3 encryption of
        data in transit; zero-trust identity and access management architecture; role-based access
        controls with least-privilege enforcement; row-level database isolation preventing
        cross-organizational data access; field-level encryption for the most sensitive data categories;
        immutable, append-only audit logging of all access and modification events; US-based data
        residency — no data stored or processed outside the United States; signed URL file access with
        expiry enforcement.
      </p>
      <p>
        <strong>Operational Controls:</strong> Multi-factor authentication required for all accounts;
        quarterly independent penetration testing; annual third-party security audit; SOC 2 Type I and
        Type II certification roadmap; vendor security review before any third-party integration;
        incident response plan with defined breach response procedures; staff privacy and security
        training at onboarding and annually thereafter.
      </p>
      <p>
        <strong>Limitation:</strong> No security system is impenetrable. NxtStps cannot guarantee
        absolute security of any information stored or transmitted through the Platform. In the event
        of a security incident involving your personal information, NxtStps will notify you as described
        in Section 13.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 13 — DATA BREACH NOTIFICATION
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">13.1 Detection and Assessment</h3>
      <p>
        In the event NxtStps discovers or reasonably suspects a security incident that may have resulted
        in unauthorized access to or disclosure of personal information, NxtStps will conduct an
        immediate assessment to determine the nature and scope of the incident.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">13.2 Notification to Users</h3>
      <p>If the assessment determines that personal information has been or is reasonably likely to have been accessed or disclosed without authorization, NxtStps will:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          (a) notify affected Users within 72 hours of determining that notification is required under
          applicable law, or as required by Illinois law — which requires notification &quot;in the most
          expedient time possible and without unreasonable delay&quot;;
        </li>
        <li>
          (b) provide notification via email to the registered address on file and through the Platform
          where possible;
        </li>
        <li>
          (c) include in the notification: a description of the incident, the categories of information
          affected, steps NxtStps is taking to address the incident, and steps Users can take to protect
          themselves.
        </li>
      </ul>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">13.3 Notification to Authorities</h3>
      <p>
        Where required by law, NxtStps will notify the Illinois Attorney General&apos;s office and other
        applicable regulatory authorities of any breach affecting Illinois residents within the timeframe
        required by the Illinois Personal Information Protection Act.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">13.4 Victim-Specific Protections</h3>
      <p>
        In any breach notification involving victim information protected by VOCA or VAWA, NxtStps will
        take particular care to ensure that breach notifications themselves do not inadvertently disclose
        victim identity or information to unauthorized parties, including by using secure notification
        channels and limiting the information included in notifications to what is legally required.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 14 — CHILDREN AND MINORS</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">14.1 Under 13</h3>
      <p>
        NxtStps does not knowingly collect personal information from children under 13 years of age
        without verifiable parental or guardian consent. If NxtStps discovers it has collected
        information from a child under 13 without appropriate consent, it will delete that information
        promptly.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">14.2 Minor Victims Ages 13–17</h3>
      <p>
        The Platform may be used in connection with crime victim compensation applications involving
        minor victims between the ages of 13 and 17. In such cases, the application must be completed and
        submitted by a parent, legal guardian, or other authorized representative. The representative is
        responsible for all information entered on the minor&apos;s behalf and must ensure that all
        applicable minor consent and confidentiality protections are observed.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">14.3 Illinois Minor Consent</h3>
      <p>
        For applications involving minors submitted through Illinois programs, all applicable Illinois
        minor consent requirements under 740 ILCS 45/ (Crime Victims Compensation Act) must be satisfied
        before submission. The Platform will prompt for guardian authorization information during the
        intake process when a minor victim is identified.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 15 — INTERNATIONAL USERS</h2>
      <p>
        The Platform is designed for use within the United States only. NxtStps does not store, process,
        or transfer personal information outside the United States. All data is stored on US-based
        servers. Users accessing the Platform from outside the United States do so at their own risk and
        are responsible for compliance with any applicable local laws. NxtStps makes no representation
        that the Platform is appropriate or available for use in any jurisdiction outside the United
        States.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 16 — CHANGES TO THIS POLICY
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">16.1 Right to Modify</h3>
      <p>
        NxtStps may update this Policy at any time to reflect changes in our data practices, applicable
        law, or platform functionality.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        16.2 Notification of Material Changes
      </h3>
      <p>
        NxtStps will notify Users of material changes to this Policy at least fifteen (15) days before
        the changes take effect by: (a) posting a notice through the Platform; (b) sending an email
        notification to your registered address; or (c) other reasonable means of communication.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        16.3 Re-Acceptance for Material Changes
      </h3>
      <p>
        For material changes — including changes to how NxtStps collects, uses, or discloses personal
        information — NxtStps may require your affirmative re-acceptance through the Platform&apos;s
        consent mechanism before you may continue using the Platform.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">16.4 Continued Use</h3>
      <p>
        Your continued use of the Platform after the effective date of any modification constitutes your
        acceptance of the modified Policy. If you do not agree to a modification, you must discontinue
        use of the Platform and close your account before the effective date.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 17 — CONTACT INFORMATION AND PRIVACY GOVERNANCE
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">17.1 Privacy Contact</h3>
      <p>
        NxtStps has designated a privacy contact responsible for overseeing compliance with this Policy,
        responding to data rights requests, and managing privacy inquiries. The privacy contact can be
        reached at the information below. All privacy inquiries, rights requests, appeals, and
        compliance concerns should be directed to this contact.
      </p>
      <p className="whitespace-pre-line">
        NxtStps, LLC{"\n"}
        Attention: Privacy{"\n"}
        [Insert Mailing Address]{"\n"}
        Chicago, Illinois{"\n"}
        Email:{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
          {privacyEmail}
        </a>
        {"\n"}
        Website: nxtstps.com
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">17.2 Response Commitment</h3>
      <p>
        NxtStps will acknowledge receipt of all privacy inquiries and data rights requests within 5
        business days. Full responses to data rights requests will be provided within 45 days as described
        in Section 10. NxtStps will not discriminate against any User for contacting us with privacy
        questions or exercising their data rights.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">17.3 Regulatory Complaints</h3>
      <p>If you believe NxtStps has not addressed your privacy concern satisfactorily, you have the right to file a complaint with:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Illinois Attorney General&apos;s Office — Consumer Protection Division, 100 W. Randolph St.,
          Chicago, IL 60601, 1-800-386-5438
        </li>
        <li>Federal Trade Commission — reportfraud.ftc.gov</li>
        <li>
          Office for Victims of Crime (OVC) — for concerns specific to VOCA compliance, ojp.gov/ovc
        </li>
      </ul>
      <p>
        NxtStps will cooperate fully with any regulatory investigation and will not retaliate against any
        User for filing a regulatory complaint.
      </p>

      <p className="text-sm text-[var(--color-muted)] pt-4 border-t border-[var(--color-border-light)]">
        NxtStps, LLC · Chicago, Illinois · nxtstps.com · Confidential and Proprietary
      </p>
    </>
  );
}
