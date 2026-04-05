import { getLegalSupportEmail } from "@/lib/legal/platformLegalConfig";

/**
 * NxtStps, LLC — Terms of Use Version 2.0 (full scroll/copy for consent + /terms).
 * Replace [Insert Mailing Address] when counsel finalizes; emails use config.
 */
export function TermsOfUseV2Document() {
  const contactEmail = getLegalSupportEmail();

  return (
    <div className="space-y-6 text-base leading-relaxed text-[var(--color-charcoal)]">
      <header className="space-y-3 border-b border-[var(--color-border-light)] pb-6">
        <p className="text-xl font-bold text-[var(--color-navy)]">NXTSTPS, LLC — TERMS OF USE</p>
        <p className="text-sm text-[var(--color-slate)]">
          Effective Date: April 5, 2026 · Last Updated: April 5, 2026 · Version: 2.0
        </p>
      </header>

      <p className="font-semibold text-[var(--color-navy)]">
        PLEASE READ THESE TERMS CAREFULLY BEFORE USING THE PLATFORM. YOUR AFFIRMATIVE ACCEPTANCE OF
        THESE TERMS THROUGH THE PLATFORM&apos;S CLICKWRAP CONSENT MECHANISM IS REQUIRED BEFORE YOU
        MAY ACCESS OR USE ANY FEATURE OF THE NXTSTPS PLATFORM. IF YOU DO NOT AGREE TO ALL TERMS,
        YOU MUST DECLINE AND DISCONTINUE USE OF THE PLATFORM.
      </p>

      <p>
        These Terms of Use (&quot;Terms&quot;) constitute a legally binding agreement between you
        (&quot;User,&quot; &quot;you,&quot; &quot;your&quot;) and NxtStps, LLC, an Illinois limited
        liability company (&quot;NxtStps,&quot; &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot;
        or &quot;our&quot;). These Terms govern your access to and use of the NxtStps platform,
        including all features, tools, workflows, AI-assisted functionality, and related services
        (collectively, the &quot;Platform&quot;).
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 1 — INTRODUCTION AND OVERVIEW
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.1 What NxtStps Is</h3>
      <p>
        NxtStps is a compliance-first administrative infrastructure platform designed to help
        victims of crime, victim advocates, and victim services organizations navigate the crime
        victim compensation application process. The Platform provides guided intake, document
        management, eligibility guidance, case tracking, and compliance reporting tools.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.2 What NxtStps Is Not</h3>
      <p>
        NxtStps is not a law firm, a legal services provider, a medical provider, a mental health
        services provider, or a government agency. The Platform does not provide legal advice,
        legal representation, medical advice, clinical services, or therapeutic services of any kind.
        No use of the Platform creates an attorney-client, therapist-client, or fiduciary
        relationship of any kind.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">1.3 Three Account Types</h3>
      <p>
        The Platform serves three distinct account types, each with different access structures,
        responsibilities, and platform functions. Where these Terms apply differently across account
        types, that distinction is noted. Where no distinction is made, these Terms apply equally to
        all account types.
      </p>
      <p>
        (a) Applicants are victims or survivors of violent crime, or their authorized representatives,
        who access the Platform directly to prepare and submit crime victim compensation applications.
        Applicants access the Platform at no cost. Where these Terms refer to &quot;you&quot; in the
        context of a victim completing a personal application, those provisions apply to Applicants.
      </p>
      <p>
        (b) Providers are victim service organizations — including community-based organizations,
        hospital-based victim intervention programs, law enforcement victim services units, faith-based
        organizations, and educational institutions — and the advocates, case managers, and
        administrative staff authorized to use the Platform on their behalf. Providers access the
        Platform through their organization&apos;s multi-user account under a paid license agreement
        with NxtStps. By accepting these Terms as a Provider user, you represent that you are
        authorized to act on behalf of your organization and that your organization has accepted these
        Terms through its licensing agreement with NxtStps.
      </p>
      <p>
        (c) Administering Agencies are government entities responsible for reviewing, processing,
        and making determinations on crime victim compensation applications — including state attorney
        general offices and their designated compensation program staff. Administering Agencies access
        the Platform through a separate account type with permissions scoped to oversight,
        reporting, and compliance functions. Administering Agency accounts are established through a
        separate agreement with NxtStps.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 2 — AGREEMENT TO THESE TERMS
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        2.1 Affirmative Acceptance Required
      </h3>
      <p>
        Access to the Platform is expressly conditioned upon your affirmative acceptance of these
        Terms through the Platform&apos;s clickwrap consent mechanism. Clicking &quot;I Agree,&quot;
        &quot;Accept,&quot; or an equivalent button constitutes your electronic signature and your
        legally binding agreement to these Terms. Passive use of the Platform does not constitute
        acceptance.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">2.2 Capacity to Accept</h3>
      <p>
        By accepting these Terms, you represent that: (a) you are at least 18 years of age, or, if
        under 18, that a parent or legal guardian is accepting these Terms on your behalf as
        required by the Platform&apos;s minor consent protocols; (b) you have the legal capacity to
        enter into a binding agreement; (c) if accepting on behalf of an Organization, you are
        authorized to bind that Organization to these Terms; and (d) your use of the Platform
        complies with all applicable federal, state, and local laws.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        2.3 Material Terms Disclosure
      </h3>
      <p>
        User acknowledges the conspicuous and material nature of the following provisions, which
        substantially affect your legal rights: disclaimer of legal, medical, and professional
        services; no duty of care; limitation of liability; indemnification obligations; mandatory
        arbitration and class action waiver; AI system limitations and mandatory user verification; no
        guarantee of application outcomes or eligibility determinations.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 3 — ACCOUNT CREATION AND SECURITY
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.1 Applicant Accounts</h3>
      <p>
        Applicants may create a personal account to save and manage their application materials. You
        are responsible for providing accurate account information and for maintaining the
        confidentiality of your login credentials. You must notify NxtStps immediately at{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>{" "}
        if you believe your account has been compromised or accessed without your authorization.
        NxtStps will not be liable for losses caused by unauthorized account access, but you may be
        liable to NxtStps for losses arising from unauthorized use of your account.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.2 Provider Accounts</h3>
      <p>
        Provider users access the Platform through their organization&apos;s multi-user account. The
        organization&apos;s designated administrator controls access permissions within the account.
        NxtStps is not responsible for access decisions made by your organization&apos;s administrator.
        If you believe your access level has been incorrectly configured, contact your
        organization&apos;s administrator directly.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        3.3 Administering Agency Accounts
      </h3>
      <p>
        Administering Agency users access the Platform through their agency&apos;s account, which is
        configured with permissions scoped to their oversight function. Administering Agency accounts
        do not include case management, survivor intake, or document upload functions. The agency&apos;s
        designated account administrator controls access permissions within the account. Administering
        Agency accounts are established through a separate agreement with NxtStps and are not subject
        to the licensing terms applicable to Provider accounts.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        3.4 Provider Account Authority
      </h3>
      <p>
        By creating or administering a Provider account, the designated administrator represents that
        they have authority to bind the organization to these Terms, to manage user access within the
        account, and to authorize the Platform&apos;s processing of data entered by or on behalf of
        the organization and its clients.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        3.5 Account Security Obligations
      </h3>
      <p>
        You agree to: (a) use a strong, unique password for your Platform account; (b) not share
        your login credentials with any other person; (c) enable multi-factor authentication when
        offered; and (d) log out of the Platform when using shared or public devices. You understand
        and agree that NxtStps may use your telephone number to send security codes and
        authentication messages as part of the multi-factor authentication process, and you consent to
        receive such messages.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">3.6 Minor Users</h3>
      <p>
        The Platform may be used in connection with crime victim compensation applications involving
        minors. Where a victim is under 18, the application must be completed and submitted by a
        parent, legal guardian, or authorized representative. Such representative accepts these Terms
        on the minor&apos;s behalf and bears sole responsibility for the accuracy of all information
        submitted.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 4 — PURPOSE OF PLATFORM; NO LEGAL, MEDICAL, OR PROFESSIONAL SERVICES
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        4.1 Administrative and Informational Tools Only
      </h3>
      <p>
        The Platform provides administrative, clerical, and informational tools designed to support
        Users in gathering documentation, organizing information, preparing application materials, and
        facilitating submission to third-party victim services programs and state agencies. All
        Platform functionality, including AI-assisted systems, operates exclusively as non-advisory,
        non-interpretive informational support.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        4.2 No Legal Advice or Representation
      </h3>
      <p>
        NxtStps is not a law firm. No content, feature, tool, automation, AI output, or workflow
        available through the Platform constitutes: (a) legal advice; (b) legal interpretation of any
        statute, regulation, or eligibility criterion; (c) analysis of your legal rights, obligations,
        or remedies; (d) representation before any agency, court, or legal body; or (e) individualized
        or fact-specific legal guidance. No attorney-client relationship is created through use of the
        Platform under any circumstances.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        4.3 No Medical, Clinical, or Therapeutic Services
      </h3>
      <p>
        NxtStps does not provide medical, mental health, psychological, crisis-intervention, trauma
        therapy, or clinical services of any kind. Users who require mental health support, crisis
        intervention, or medical assistance must seek qualified professional assistance. Use of this
        Platform does not constitute mental health treatment or therapeutic engagement.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        4.4 No Guarantee of Outcomes or Eligibility
      </h3>
      <p>
        NxtStps does not guarantee, warrant, predict, or represent that any User will: (a) qualify for
        any victim compensation program or benefit; (b) receive any award, payment, or favorable
        determination; (c) avoid denial, error, or delay; or (d) meet any program-specific deadline
        or procedural requirement. All eligibility determinations are made exclusively by the
        relevant state agency or administering authority. NxtStps has no role in and no influence over
        those determinations.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 5 — PROHIBITION AGAINST UNAUTHORIZED PRACTICE OF LAW
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">5.1 No Legal Interpretation</h3>
      <p>
        The Platform does not — under any circumstances — interpret statutes, regulations,
        eligibility criteria, procedural rules, or legal requirements. The rules engine that guides
        Users through the application process operates on the basis of administrative workflow logic,
        not legal analysis or statutory interpretation.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">5.2 Non-Directive Operation</h3>
      <p>
        Platform functionality is exclusively clerical and informational. NxtStps does not recommend
        specific legal responses, analyze the legal sufficiency of any submission, or direct how Users
        should answer any question in a legally binding sense. All guidance presented by the Platform
        is administrative in nature and does not constitute legal direction.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        5.3 User Decision-Making Authority
      </h3>
      <p>
        All decisions regarding legal compliance, eligibility, the accuracy of responses, and
        procedural strategy remain solely with the User. The Platform assists with the organizational
        and administrative aspects of preparing a compensation application. Legal judgment remains
        entirely with the User and, where applicable, with the User&apos;s legal counsel or victim
        advocate.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 6 — ARTIFICIAL INTELLIGENCE DISCLOSURES
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        6.1 AI Functions Within the Platform
      </h3>
      <p>
        The Platform incorporates artificial intelligence functionality including document parsing,
        completeness validation, eligibility pre-screening logic, and language translation assistance.
        These AI systems are designed to assist Users, not to replace human judgment.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.2 Non-Deterministic Outputs</h3>
      <p>
        User acknowledges that AI-generated suggestions, completeness flags, and guidance may be
        inaccurate, incomplete, outdated, or unsuitable for a particular situation. AI outputs are
        not legal determinations, factual certifications, or professional advice of any kind.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        6.3 No Autonomous Eligibility Decisions
      </h3>
      <p>
        AI systems within the Platform do not make eligibility determinations. The Platform&apos;s AI
        functionality guides, flags, and assists — it does not decide, approve, or deny. All final
        eligibility determinations remain exclusively with the administering state agency.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.4 Mandatory User Review</h3>
      <p>
        All AI-generated outputs, suggested responses, document summaries, and completeness assessments
        must be independently reviewed and verified by the User before any submission is made. NxtStps
        disclaims all liability for harm arising from reliance on AI-generated content without
        independent User verification.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">6.5 AI Training Prohibition</h3>
      <p>
        NxtStps does not use individually identifiable User data to train AI models. Aggregate,
        anonymized, de-identified data may be used for platform improvement, system modeling, and
        compliance analytics, but no identifiable victim information is used for AI training,
        commercial data purposes, or external disclosure.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        6.6 Human Override Always Available
      </h3>
      <p>
        No AI-assisted action on the Platform proceeds without explicit User confirmation. Users may
        override, disregard, or ignore any AI-generated suggestion at any time. The Platform is
        designed so that Users retain complete control over all information entered and all
        submissions made.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 7 — CONTENT, DATA, AND INTELLECTUAL PROPERTY
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">7.1 User Content</h3>
      <p>
        &quot;User Content&quot; means all data, documents, responses, narratives, images, and other
        materials that you enter, upload, transmit, or submit through the Platform. You are solely
        responsible for all User Content you provide.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        7.2 Your Ownership of User Content
      </h3>
      <p>
        You retain all intellectual property rights in your User Content. NxtStps does not claim
        ownership of your personal information, your uploaded documents, or your application
        materials.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        7.3 License to NxtStps for Platform Operation
      </h3>
      <p>
        By submitting User Content through the Platform, you grant NxtStps a limited, non-exclusive,
        royalty-free license to store, process, and use your User Content solely for the purpose of
        operating the Platform and delivering the services described in these Terms. This license
        does not permit NxtStps to sell, commercialize, or disclose your User Content to third parties
        except as described in the Privacy Policy.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        7.4 Aggregated and Anonymized Data
      </h3>
      <p>
        NxtStps may collect, derive, and use aggregated, anonymized, and de-identified data regarding
        Platform usage, application patterns, administrative workflows, and system performance. NxtStps
        owns all such aggregated and anonymized data and may use it without restriction for platform
        improvement, compliance reporting, analytics, and research purposes. No Applicant is
        identifiable from this aggregated data.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        7.5 NxtStps Platform Ownership
      </h3>
      <p>
        All rights, title, and interest in the Platform — including its software, AI systems, rules
        engine, document intelligence functionality, user interface, and all related intellectual
        property — are owned exclusively by NxtStps, LLC. These Terms grant you a limited right to use
        the Platform and do not transfer any ownership interest to you.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">7.6 Feedback License</h3>
      <p>
        If you provide NxtStps with feedback, suggestions, ideas, or recommendations about the
        Platform (&quot;Feedback&quot;), you grant NxtStps a perpetual, worldwide, irrevocable,
        royalty-free license to use, incorporate, and build upon that Feedback in any way, including
        in future platform features, without compensation or attribution to you.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 8 — PROHIBITED USES</h2>
      <p>You agree not to use the Platform to:</p>
      <ul className="list-none space-y-3 pl-0">
        <li>
          (a) violate any applicable federal, state, or local law, regulation, or ordinance; (b) submit
          false, fraudulent, or materially misleading information in any application or document; (c)
          impersonate any person, organization, agency, or official, or misrepresent your authority to
          act on another&apos;s behalf; (d) access or attempt to access another User&apos;s account,
          data, or case materials without authorization; (e) reverse engineer, decompile,
          disassemble, or attempt to extract the source code of any part of the Platform; (f) scrape,
          crawl, or systematically extract data from the Platform using automated tools or methods;
          (g) use the Platform or any data derived from it to train, develop, or improve any artificial
          intelligence or machine learning system without NxtStps&apos;s prior written authorization;
          (h) transmit any malware, virus, trojan horse, or other harmful code or data through the
          Platform; (i) interfere with, disrupt, or degrade the performance, security, or integrity of
          the Platform or its infrastructure; (j) use the Platform to prepare applications on behalf
          of others for commercial gain, unless you are an authorized Provider user acting within your
          organizational role; (k) reproduce, resell, sublicense, or distribute any portion of the
          Platform or its content without NxtStps&apos;s prior written authorization; (l) use the
          Platform for any purpose that violates VOCA confidentiality requirements, VAWA privacy
          restrictions, HIPAA-adjacent standards applicable to health-related information, or any
          applicable victim confidentiality statute; or (m) encourage, enable, or assist any other
          person to engage in any of the prohibited uses described above.
        </li>
      </ul>
      <p>
        NxtStps reserves the right to suspend or terminate any account upon reasonable suspicion of
        prohibited use, without prior notice, and to report suspected violations of law to appropriate
        authorities.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 9 — USER REPRESENTATIONS, RESPONSIBILITIES, AND VERIFICATION
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        9.1 Accuracy and Completeness
      </h3>
      <p>
        You bear sole and exclusive responsibility for all information, statements, and documents that
        you enter, upload, or submit through the Platform. NxtStps does not review, verify, approve,
        interpret, or edit your submissions.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">9.2 Verification Requirement</h3>
      <p>
        You must independently review all Platform outputs — including AI-generated content, document
        summaries, completeness assessments, and pre-filled fields — before signing, submitting,
        certifying, or transmitting any document to any third party. Reliance on Platform outputs
        without independent verification is at your sole risk.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        9.3 Provider User Responsibility
      </h3>
      <p>
        Provider users who prepare or assist in the preparation of applications on behalf of
        Applicants bear additional responsibility to: (a) obtain appropriate authorization from the
        Applicant before accessing or submitting their information; (b) ensure the accuracy of all
        information entered on the Applicant&apos;s behalf; and (c) comply with all applicable
        confidentiality obligations under VOCA, VAWA, and applicable state law.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">9.4 No Causation by NxtStps</h3>
      <p>
        User waives any claim alleging that NxtStps caused or contributed to: (a) denial or adverse
        determination of a compensation application; (b) missed filing deadlines; (c) procedural
        deficiencies; or (d) financial, legal, or administrative harm arising from any submission made
        through the Platform.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 10 — NO DUTY OF CARE; ANTI-NEGLIGENCE PROVISIONS
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        10.1 No Duty to Monitor or Correct
      </h3>
      <p>NxtStps has no duty to:</p>
      <p>
        (a) review any submission for legal sufficiency or accuracy; (b) warn Users of the
        consequences of specific answers or choices; (c) ensure that automated completeness guidance
        has identified every document required by a specific program; (d) correct errors in
        User-provided information; or (e) ensure that any submission complies with the specific
        requirements of any victim compensation program.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        10.2 Completeness Guidance Limitation
      </h3>
      <p>
        The Platform&apos;s document completeness validation and eligibility guidance features are
        designed to reduce common errors and omissions. These features do not guarantee that a
        submission will be complete or compliant with the specific requirements of any program. The
        User remains solely responsible for verifying that all required documentation has been
        included and is accurate before submission.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.3 No Duty to Update</h3>
      <p>
        NxtStps is not responsible for ensuring that Platform content, eligibility guidance, or rules
        engine logic reflects the most current version of applicable law, regulation, or program
        requirements. Program requirements change frequently. Users should verify current requirements
        directly with the relevant agency before submitting any application.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">10.4 Foreseeability Waiver</h3>
      <p>
        User waives any claim arising from foreseeable risks associated with the application process,
        including the risk of denial, delay, or adverse determination.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 11 — PRIVACY AND DATA SECURITY
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">11.1 Privacy Policy</h3>
      <p>
        Your use of the Platform is also governed by the NxtStps Privacy Policy, which is incorporated
        into these Terms by reference. By accepting these Terms you also accept the Privacy Policy.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">11.2 Security Safeguards</h3>
      <p>
        NxtStps employs commercially reasonable administrative, technical, and physical safeguards —
        including encryption, role-based access controls, multi-factor authentication, and immutable
        audit logging — to protect User data. No security system is impenetrable, and NxtStps does not
        guarantee absolute security.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        11.3 No Liability for Third-Party Actions
      </h3>
      <p>
        NxtStps is not liable for unauthorized access, disclosure, or use of User data caused by third
        parties, including state agencies, victim services organizations, or other recipients of
        User-directed submissions.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        11.4 VOCA and VAWA Compliance
      </h3>
      <p>
        NxtStps handles victim information in compliance with VOCA confidentiality requirements and
        VAWA Section 40002(b)(2) privacy restrictions. NxtStps will not disclose individually
        identifiable victim information to third parties except as expressly directed by the User or as
        required by law, and will comply with all applicable restrictions and consent requirements
        before any disclosure of victim-related information.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 12 — EMOTIONAL DISTRESS LIABILITY SHIELD
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        12.1 Acknowledgment of Subject Matter Sensitivity
      </h3>
      <p>
        User acknowledges that completing documentation related to violent crime, injury, loss, or
        trauma may be emotionally difficult, and that such difficulty is an inherent aspect of the
        underlying subject matter rather than a consequence of Platform design or malfunction.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        12.2 Limitation of Liability for Emotional Distress
      </h3>
      <p>
        NxtStps shall not be liable for emotional distress, psychological discomfort, or trauma
        responses arising from the nature of crime victim compensation documentation processes, except
        in cases of gross negligence or willful misconduct by NxtStps.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">12.3 Crisis Support</h3>
      <p>
        NxtStps is not a crisis support service. If you are experiencing a mental health crisis or
        are in immediate danger, please contact the 988 Suicide and Crisis Lifeline (call or text
        988), the Crisis Text Line (text HOME to 741741), or emergency services (911).
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">12.4 No Clinical Responsibility</h3>
      <p>
        NxtStps bears no clinical, therapeutic, or medical responsibility for any User&apos;s
        emotional, psychological, or mental health state before, during, or after Platform use.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 13 — PRODUCT FUNCTIONALITY AND SERVICE LIMITATIONS
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        13.1 No Warranty of Continuous Operation
      </h3>
      <p>
        The Platform is provided &quot;as-is&quot; and &quot;as available.&quot; NxtStps does not
        warrant uninterrupted service, error-free functionality, the absence of defects, or the
        preservation of data in all circumstances.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        13.2 Beta Features and MVP Phases
      </h3>
      <p>
        The Platform is in active development. Certain features may be released in prototype, beta,
        or early-access form before full production deployment. Such features are provided as-is and
        may have limitations, may not function as expected, and may be modified or discontinued without
        notice. User participation in any beta or early-access feature does not create any entitlement
        to continued access or any warranty of functionality.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        13.3 User Responsibility for Backups
      </h3>
      <p>
        You are responsible for maintaining your own copies of all documents and information you
        submit through or create within the Platform. NxtStps is not responsible for data loss arising
        from technical failure, account termination, or service discontinuation.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        13.4 Third-Party Services and Integrations
      </h3>
      <p>
        The Platform may connect to or integrate with third-party systems, including law enforcement
        records management systems, hospital electronic medical record systems, state agency portals,
        and other external services (&quot;Third-Party Services&quot;). NxtStps does not control,
        endorse, or warrant the accuracy, availability, or performance of any Third-Party Service.
        NxtStps is not responsible for any harm, data loss, or adverse outcome arising from the
        operation or failure of any Third-Party Service. Your use of any Third-Party Service may be
        subject to that service&apos;s own terms and conditions.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 14 — COMMUNICATIONS AND CONTACT PREFERENCES
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">14.1 Platform Communications</h3>
      <p>
        NxtStps may contact you via email, text message, or in-platform notification for purposes
        including: (a) account security and multi-factor authentication; (b) important notices regarding
        your account or case; (c) service updates or changes to these Terms; and (d) system alerts
        relevant to your application.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">14.2 MFA and Security Messages</h3>
      <p>
        By providing a telephone number in connection with your Platform account, you consent to
        receive text messages from NxtStps containing security codes and authentication messages as part
        of the multi-factor authentication process. Message frequency varies. Message and data rates
        may apply. Reply STOP to opt out of security text messages, though doing so may prevent you
        from accessing certain platform features that require authentication.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">14.3 Opt-Out</h3>
      <p>
        You may opt out of non-essential communications from NxtStps at any time by following the
        unsubscribe instructions in any email communication or by contacting us at{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
        . You may not opt out of essential security and account communications without closing your
        account.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        14.4 Organizational Communications
      </h3>
      <p>
        NxtStps may contact an Organization&apos;s designated administrator regarding account status,
        licensing, compliance, and platform updates. The administrator is responsible for distributing
        relevant communications to appropriate personnel within the Organization.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 15 — DISCLAIMERS</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">15.1 As-Is Provision</h3>
      <p className="font-semibold text-[var(--color-navy)]">
        THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
        ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NXTSTPS
        EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
        FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">15.2 No Warranty of Accuracy</h3>
      <p>
        NxtStps does not warrant the accuracy, completeness, or suitability of any content, guidance,
        AI output, eligibility assessment, or completeness check provided through the Platform for
        any specific User&apos;s situation or program requirements.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">15.3 FTC Compliance</h3>
      <p>
        No marketing statement, Platform content, AI output, or feature description constitutes a
        guarantee, promise, or prediction of any application outcome. All representations about
        Platform capabilities describe general functionality and do not constitute warranties
        applicable to any Applicant&apos;s specific circumstances.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 16 — LIMITATION OF LIABILITY
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        16.1 Exclusion of Consequential Damages
      </h3>
      <p className="font-semibold text-[var(--color-navy)]">
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NXTSTPS SHALL NOT BE LIABLE FOR ANY
        INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
        LIMITED TO LOSS OF DATA, LOSS OF BENEFITS OR COMPENSATION AWARDS, LOST OPPORTUNITIES,
        EMOTIONAL DISTRESS, OR ANY OTHER PERSONAL OR ECONOMIC HARM, ARISING OUT OF OR RELATED TO YOUR
        USE OF OR INABILITY TO USE THE PLATFORM, REGARDLESS OF WHETHER NXTSTPS HAS BEEN ADVISED OF THE
        POSSIBILITY OF SUCH DAMAGES.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">16.2 Aggregate Liability Cap</h3>
      <p className="font-semibold text-[var(--color-navy)]">
        NXTSTPS&apos;S TOTAL AGGREGATE LIABILITY TO ANY USER FOR ALL CLAIMS ARISING FROM OR RELATED TO
        THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE GREATER OF: (a) THE AMOUNT PAID BY THE USER OR
        THE USER&apos;S ORGANIZATION TO NXTSTPS IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM; OR (b)
        ONE HUNDRED DOLLARS ($100).
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">16.3 Essential Basis</h3>
      <p>
        USER ACKNOWLEDGES THAT THE LIMITATIONS OF LIABILITY IN THIS SECTION REFLECT A REASONABLE
        ALLOCATION OF RISK AND ARE AN ESSENTIAL ELEMENT OF THE BASIS OF THE BARGAIN BETWEEN NXTSTPS AND
        USER. NXTSTPS WOULD NOT PROVIDE THE PLATFORM WITHOUT THESE LIMITATIONS.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 17 — INDEMNIFICATION</h2>
      <p>
        You agree to indemnify, defend, and hold harmless NxtStps, LLC and its members, managers,
        officers, employees, contractors, and agents (collectively, &quot;NxtStps Parties&quot;) from
        and against all claims, liabilities, damages, losses, costs, and expenses — including reasonable
        attorneys&apos; fees — arising out of or related to: (a) your use of or access to the Platform
        in violation of these Terms; (b) inaccurate, incomplete, or fraudulent information you
        submitted through the Platform; (c) your misinterpretation of any Platform output as legal,
        medical, or professional advice; (d) your submission of materials to any third-party agency,
        program, or recipient; (e) violations of applicable law, VOCA, VAWA, or any victim
        confidentiality statute arising from your use of the Platform; (f) any claim by a third party
        arising from your unauthorized access to their information through the Platform; or (g) if you
        are a Provider user, any claim arising from your use of the Platform on behalf of an
        Applicant, including claims arising from the Applicant&apos;s data. NxtStps reserves the right
        to assume exclusive control of any matter subject to indemnification at its own expense. You
        agree to cooperate reasonably with NxtStps in the defense of any such claim.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 18 — MANDATORY ARBITRATION AND CLASS ACTION WAIVER
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">
        18.1 Informal Resolution First
      </h3>
      <p>
        Before initiating any formal dispute, you agree to contact NxtStps at{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>{" "}
        and attempt to resolve the dispute informally. NxtStps will attempt to resolve any dispute
        informally within sixty (60) days of receiving written notice. If the dispute is not resolved
        within sixty (60) days, either party may proceed to arbitration as described below.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">18.2 Binding Arbitration</h3>
      <p>
        Except as provided in Section 18.5, all disputes, claims, or controversies arising out of or
        relating to these Terms, the Platform, or your relationship with NxtStps (&quot;Disputes&quot;)
        shall be resolved exclusively by final and binding arbitration administered by the American
        Arbitration Association (&quot;AAA&quot;) under its Consumer Arbitration Rules, before a single
        arbitrator, in Chicago, Illinois. The arbitrator&apos;s decision shall be final and binding
        and may be entered as a judgment in any court of competent jurisdiction.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">18.3 Class Action Waiver</h3>
      <p className="font-semibold text-[var(--color-navy)]">
        YOU AND NXTSTPS AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS
        INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE,
        OR REPRESENTATIVE ACTION. The arbitrator may not consolidate more than one person&apos;s
        claims or preside over any form of class or representative proceeding.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">18.4 Arbitration Opt-Out</h3>
      <p>
        You may opt out of this arbitration agreement within thirty (30) days of first accepting
        these Terms by sending written notice to NxtStps at{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>{" "}
        with the subject line &quot;Arbitration Opt-Out,&quot; including your full name, account email
        address, and a statement that you wish to opt out of arbitration. Opting out does not affect
        any other provision of these Terms.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">18.5 Exceptions</h3>
      <p>
        Notwithstanding Section 18.2, either party may seek: (a) injunctive or other equitable relief
        in any court of competent jurisdiction to prevent imminent harm, including unauthorized use of
        the Platform or IP infringement; or (b) resolution of eligible claims in a small claims court.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">18.6 Governing Rules</h3>
      <p>
        The Federal Arbitration Act governs the interpretation and enforcement of this Section. AAA
        rules are available at{" "}
        <a
          className="underline hover:text-[var(--color-navy)]"
          href="https://www.adr.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          www.adr.org
        </a>
        .
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 19 — TERMINATION</h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">19.1 Termination by User</h3>
      <p>
        Applicants may close their account at any time by following the account deletion instructions
        in the Platform or by submitting a deletion request as described in the User Deletion Policy.
        Provider users and Administering Agency users should contact their organization&apos;s
        administrator to remove their access; account termination for organizations is governed by
        the organization&apos;s agreement with NxtStps.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">19.2 Termination by NxtStps</h3>
      <p>
        NxtStps may suspend or terminate your access to the Platform at any time, with or without
        notice, if: (a) you violate any provision of these Terms; (b) NxtStps reasonably believes your
        use of the Platform poses a risk to other Users, third parties, or NxtStps; (c) required by
        applicable law or court order; or (d) the Platform is discontinued.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">19.3 Effect of Termination</h3>
      <p>
        Upon termination of your account or these Terms: (a) your right to access and use the Platform
        immediately ceases; (b) NxtStps will handle your data in accordance with the Privacy Policy and
        User Deletion Policy; and (c) all provisions that by their nature should survive termination
        will survive as specified in Section 20.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">19.4 Data Following Termination</h3>
      <p>
        Upon account termination, NxtStps will retain and delete your data in accordance with the
        retention schedules and deletion protocols described in the Privacy Policy and User Deletion
        Policy, subject to any legal hold obligations.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 20 — SURVIVAL</h2>
      <p>
        The following Sections will survive any termination, cancellation, or expiration of these Terms
        or your account: Section 5 (UPL Defense), Section 7 (Content, Data, and IP), Section 8
        (Prohibited Uses), Section 9.4 (No Causation), Section 10 (No Duty of Care), Section 12
        (Emotional Distress Liability Shield), Section 15 (Disclaimers), Section 16 (Limitation of
        Liability), Section 17 (Indemnification), Section 18 (Arbitration), Section 20 (Survival),
        Section 21 (Governing Law), and Section 22 (Assignment).
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 21 — GOVERNING LAW</h2>
      <p>
        These Terms and any dispute arising out of or related to them shall be governed by and
        construed in accordance with the laws of the State of Illinois, without regard to its conflict
        of law principles. The United Nations Convention on Contracts for the International Sale of
        Goods does not apply to these Terms.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 22 — ASSIGNMENT</h2>
      <p>
        NxtStps may assign or transfer these Terms, or any rights or obligations under them, to any
        party at any time without notice to you, including in connection with a merger, acquisition,
        restructuring, or sale of assets. You may not assign or transfer any of your rights or
        obligations under these Terms without NxtStps&apos;s prior written consent. Any attempt to
        assign without consent is void.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 23 — CHANGES TO THESE TERMS
      </h2>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">23.1 Right to Modify</h3>
      <p>
        NxtStps may modify these Terms at any time. We will notify you of material changes by posting a
        notice through the Platform, by email to your registered address, or by other reasonable means
        at least fifteen (15) days before the changes take effect.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">23.2 Acceptance of Changes</h3>
      <p>
        For material changes, NxtStps may require your affirmative re-acceptance through the
        Platform&apos;s consent mechanism before you may continue using the Platform. Your continued
        use of the Platform after the effective date of any change constitutes your acceptance of the
        modified Terms.
      </p>
      <h3 className="text-base font-medium text-[var(--color-charcoal)]">23.3 Right to Decline</h3>
      <p>
        If you do not agree to any modification of these Terms, you must discontinue use of the
        Platform before the effective date of the change and close your account.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 24 — WAIVER</h2>
      <p>
        NxtStps&apos;s failure to enforce any provision of these Terms in any instance shall not
        constitute a waiver of NxtStps&apos;s rights to enforce that provision in the future. Any
        waiver of any provision of these Terms must be in writing and signed by an authorized
        representative of NxtStps.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 25 — SEVERABILITY</h2>
      <p>
        If any provision of these Terms is found to be unlawful, void, or unenforceable by a court of
        competent jurisdiction, that provision shall be severed from these Terms to the minimum extent
        necessary, and the remaining provisions shall remain in full force and effect.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">SECTION 26 — ENTIRE AGREEMENT</h2>
      <p>
        These Terms, together with the Privacy Policy, User Deletion Policy, and any licensing
        agreement between your Organization and NxtStps, constitute the entire agreement between you and
        NxtStps regarding your use of the Platform and supersede all prior agreements, communications,
        and understandings, whether written or oral, relating to the same subject matter.
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">
        SECTION 27 — CONTACT INFORMATION
      </h2>
      <p>For questions about these Terms, to exercise your rights, or to submit a dispute notice or arbitration opt-out:</p>
      <p className="whitespace-pre-line">
        NxtStps, LLC{"\n"}
        [Insert Mailing Address]{"\n"}
        Chicago, Illinois{"\n"}
        Email:{" "}
        <a className="underline hover:text-[var(--color-navy)]" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
        {"\n"}
        Website: nxtstps.com
      </p>

      <h2 className="text-lg font-semibold text-[var(--color-navy)] pt-2">USER ACKNOWLEDGMENT</h2>
      <p>
        By clicking &quot;I Agree&quot; or &quot;Accept,&quot; you confirm that you have read,
        understood, and voluntarily agree to be bound by these Terms of Use. If you are accepting on
        behalf of an Organization, you confirm that you have the authority to bind that Organization to
        these Terms.
      </p>

      <p className="text-sm text-[var(--color-muted)] pt-4 border-t border-[var(--color-border-light)]">
        NxtStps, LLC · Chicago, Illinois · nxtstps.com · Confidential and Proprietary
      </p>
    </div>
  );
}
