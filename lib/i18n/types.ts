// lib/i18n/types.ts
export type I18nDict = {
  nav: {
    dashboard: string;
    dashboardVictim: string;
    dashboardAdvocate: string;
    login: string;
    logout: string;
    myAccount: string;
    accountPlaceholderTitle: string;
    accountPlaceholderBody: string;
    /** Shown under the email card when the victim personal info form is present. */
    accountVictimEmailCardBody: string;
    /** Shown under the email card when the advocate personal info form is present. */
    accountAdvocateEmailCardBody: string;
    language: string;
    brandTagline: string;
    /** Top nav link to /compensation (Crime Victims Compensation hub). */
    compensationHub: string;
    home: string;
    help: string;
    updates: string;
    accountNav: string;
    /** Victim home nav + dashboard label (“My Dashboard”). */
    mySupport: string;
    /** Victim nav: intake (short label) */
    application: string;
    /** Secure messages (victim / advocate). */
    messages: string;
    /** Advocate home (/advocate) — visible label “My Dashboard”. */
    myDashboardAdvocate: string;
    /** @deprecated Prefer myDashboardAdvocate; kept for gradual migration. */
    commandCenter: string;
    clients: string;
    organization: string;
    adminHome: string;
  };

  common: {
    loading: string;
    refresh: string;
    refreshing: string;
    backToHome: string;
    backToWorkspace: string;
    /** Same as backToWorkspace without leading arrow (inline links). */
    backToWorkspaceInline: string;
    yes: string;
    no: string;
  };

  /** /notifications page */
  notificationsPage: {
    title: string;
    subtitle: string;
    empty: string;
    markRead: string;
    /** Accessible label for the read-state checkmark */
    readBadgeLabel: string;
    /** When strict previews hide notification titles */
    previewHiddenTitle: string;
    /** Advocate inbox: incoming connection request */
    connectionRequestIncomingTitle: string;
    /** Survivor: outbound request awaiting advocate response */
    connectionRequestPendingTitle: string;
    /** Organization inbox: advocate wants to join */
    orgJoinRequestIncomingTitle: string;
    orgJoinApprove: string;
    orgJoinDecline: string;
  };

  signup: {
    /** Victim signup: how we address them (saved to account profile). */
    preferredNameLabel: string;
    preferredNamePlaceholder: string;
    preferredNameHelp: string;
  };

  victimDashboard: {
    eyebrow: string;
    title: string;
    /** Use tf(..., { name }) — shown when account has a preferred or legal name */
    welcomeTitle: string;
    subtitle: string;
    signedInAs: string;
    signedInAsUnknown: string;
    whatToDoNext: string;
    creating: string;
    yourApplicationHeading: string;
    yourApplicationDescription: string;
    yourApplicationPrivacyLine: string;
    statusField: string;
    eligibilityField: string;
    updatingDetails: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityLow: string;
    caseActivityTitle: string;
    caseActivityIntro: string;
    caseActivityMessages: string;
    caseActivityDocuments: string;
    caseActivityAppointments: string;
    caseActivitySupport: string;
    messagesLoading: string;
    messagesUnreadOne: string;
    messagesUnreadMany: string;
    messagesInThread: string;
    messagesEmpty: string;
    documentsStatusMissing: string;
    documentsStatusGeneric: string;
    documentsNoCase: string;
    appointmentsEmpty: string;
    supportMatchOne: string;
    supportMatchMany: string;
    supportNoMatches: string;
    supportNoCase: string;
    yourCasesTitle: string;
    yourCasesHelp: string;
    stateIL: string;
    stateIN: string;
    startApplication: string;
    noCasesTitle: string;
    noCasesBody: string;
    loadError: string;
    sessionExpired: string;
    continue: string;
    more: string;
    delete: string;
    rename: string;
    save: string;
    cancel: string;
    caseNamePlaceholder: string;
    lastUpdatedDaysAgo: string;
    lastUpdatedToday: string;
    lastUpdatedYesterday: string;
    lastUpdatedUnknown: string;
    deleteModalTitle: string;
    deleteModalBodyLine1: string;
    deleteModalBodyLine2: string;
    deleteModalCancel: string;
    deleteModalConfirm: string;
    deleteFailed: string;
    editNameTitle: string;
    funnel: {
      ariaLabel: string;
      stepEligibility: string;
      stepApplication: string;
      stepSupport: string;
      stepHint: string;
    };
    myCasesDropdown: string;
    /** Label above the case selector on the dashboard */
    myCasesSectionLabel: string;
    resumeApplication: string;
    /** Accessible label for the primary apply / resume card region */
    applyResumeCardAria: string;
    supportTeamTitle: string;
    supportTeamOrg: string;
    supportTeamAdvocates: string;
    supportTeamNoOrg: string;
    supportTeamNoAdvocates: string;
    supportTeamLoading: string;
    supportTeamConnectCta: string;
    /** Shown under Advocates when a connection request is awaiting advocate response */
    supportTeamAdvocateRequestPending: string;
    supportTeamAddOrgCta: string;
    /** Title/tooltip on linked org name — opens find / change organization */
    supportTeamEditOrgTitle: string;
    /** Title/tooltip on linked advocate name(s) — opens advocate connection */
    supportTeamEditAdvocateTitle: string;
    /** Inline next to advocate — opens secure messages */
    supportTeamSendMessage: string;
    /** Inline next to org — opens secure messages */
    supportTeamContactOrg: string;
    caseAdvocateManage: {
      title: string;
      back: string;
      intro: string;
      sendMessage: string;
      remove: string;
      removeConfirmTitle: string;
      removeConfirmBody: string;
      connectDifferent: string;
      removed: string;
      removeFailed: string;
    };
    caseOrgManage: {
      title: string;
      back: string;
      intro: string;
      contactOrganization: string;
      changeOrganization: string;
      removeOrganization: string;
      removeConfirmTitle: string;
      removeConfirmBody: string;
      legacyLabel: string;
      /** After PATCH reset to legacy org */
      organizationRemoved: string;
      updated: string;
      updateFailed: string;
      noOrgBody: string;
    };
    /** Apply Now modal — first step: two choices only */
    applyPathConnect: string;
    applyPathSelf: string;
    applyPathBack: string;
    /** Screen reader label for the path dialog (no visible title) */
    applyPathAria: string;
    stateModalTitle: string;
    stateModalSubtitle: string;
    /** Use with tf(..., { state: "Illinois" | "Indiana" }) */
    eligibleReviewIntro: string;
    continueToEligibility: string;
    /** Primary CTA when user has no cases yet */
    applyNow: string;
    /** Prompt to finish account profile (name, phone, city) */
    profileBannerTitle: string;
    /** When user has no preferred or legal name on file */
    profileBannerBodyNoName: string;
    profileBannerBody: string;
    profileBannerCta: string;
    /** Secondary action when user already has at least one case */
    startNewApplication: string;
    /** Header control: create another case without leaving the dashboard */
    newCaseButton: string;
    /** Summary for case actions menu (rename / delete) */
    caseEdit: string;
    getHelp: {
      title: string;
      connectAdvocate: string;
      findOrganizations: string;
      hintAdvocate: string;
      hintOrganizations: string;
    };
    findOrganizationsPage: {
      title: string;
      /** Short intro under the page title */
      subtitle: string;
      back: string;
      mapIntro: string;
      shareLocation: string;
      sharing: string;
      tryAgain: string;
      locationDenied: string;
      /** Generic fallback when the browser doesn’t give a specific code */
      locationUnavailable: string;
      locationTimeout: string;
      positionUnavailable: string;
      locationNotSupported: string;
      locationNeedsHttps: string;
      yourLocation: string;
      approximateNote: string;
      milesAway: string;
      accepting: string;
      notAccepting: string;
      capacity: string;
      noOrgs: string;
      loadError: string;
      privacyNote: string;
    };
    /** Gamified 3-step strip + apply flow */
    progressTitle: string;
    selectedCaseLabel: string;
    activeCaseBadge: string;
    caseActivityForCase: string;
    /** Section heading for messages / documents / appointments rows */
    caseDetailsHeading: string;
    nextStepTitle: string;
    /** Shown when the case has no program state (IL/IN) before opening eligibility */
    eligibilityPickStateFirst: string;
    applyForCompensation: string;
    applyModal: {
      title: string;
      body: string;
      checkFirst: string;
      skipToForm: string;
      skipNote: string;
    };
    nextAction: {
      labels: {
        noCases: string;
        noFocusCase: string;
        continueEligibility: string;
        continueApplication: string;
        viewMessages: string;
        uploadDocuments: string;
        completeRequiredInfo: string;
        continueSectionsIncomplete: string;
        reviewSkippedFields: string;
        connectAdvocate: string;
        viewSupportOptions: string;
        upToDate: string;
      };
      reasons: {
        noCases: string;
        noFocusCase: string;
        continueEligibility: string;
        continueApplication: string;
        /** When core intake fields are complete and ready to finalize */
        submitApplication: string;
        messagesUnreadOne: string;
        messagesUnreadMany: string;
        uploadDocuments: string;
        completeRequiredInfo: string;
        continueSectionsIncomplete: string;
        reviewSkippedFields: string;
        connectAdvocate: string;
        viewSupportOptions: string;
        upToDate: string;
      };
    };
    /** Smaller “next step” control under the Next Step heading (hub main is Apply / Resume). */
    contextualNextStep: {
      checkEligibility: string;
      finishApplication: string;
      submitApplication: string;
    };
  };

  /** /victim/messages — secure threads by case */
  victimMessages: {
    backDashboard: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    loadError: string;
    noCases: string;
    startApplication: string;
    casePickerLabel: string;
    yourCases: string;
    threadHeading: string;
    threadSubtitle: string;
    threadEmpty: string;
  };

  /** /advocate — home dashboard */
  advocateDashboard: {
    /** Use tf(..., { name }) when profile has a display name */
    welcomeTitle: string;
    /** When no name on file yet */
    titleFallback: string;
    /** Shown under the title when the advocate belongs to an org (tf with { name }). */
    organizationMeta: string;
    /** Lead-in before the connect link when the advocate has no org membership */
    noOrganizationMeta: string;
    /** Link label — opens find-organizations map flow */
    connectOrganizationLink: string;
    profileBannerTitle: string;
    profileBannerBody: string;
    profileBannerBodyNoName: string;
    profileBannerCta: string;
  };

  /** /advocate/find-organizations — map + request to join org */
  advocateFindOrganizations: {
    title: string;
    subtitle: string;
    back: string;
    mapIntro: string;
    stateFilterLabel: string;
    shareLocation: string;
    sharing: string;
    tryAgain: string;
    locationDenied: string;
    locationUnavailable: string;
    locationTimeout: string;
    positionUnavailable: string;
    locationNotSupported: string;
    locationNeedsHttps: string;
    yourLocation: string;
    approximateNote: string;
    milesAway: string;
    accepting: string;
    notAccepting: string;
    capacity: string;
    noOrgs: string;
    noOrgsInState: string;
    loadError: string;
    privacyNote: string;
    requestJoin: string;
    requestSent: string;
    requestBusy: string;
    requestError: string;
    /** Combobox label + search */
    orgPickerLabel: string;
    orgSearchPlaceholder: string;
    orgSearchNoMatches: string;
    orgSelectedTitle: string;
  };

  /** /compensation hub (public) */
  compensationHub: {
    contextLine: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    primaryHint: string;
    secondaryGetHelp: string;
    secondaryConnectAdvocate: string;
    learnLink: string;
    howItWorksTitle: string;
    step1Label: string;
    step1Title: string;
    step1Body: string;
    step2Label: string;
    step2Title: string;
    step2Body: string;
    step3Label: string;
    step3Title: string;
    step3Body: string;
    mayNeedTitle: string;
    mayNeedLi1: string;
    mayNeedLi2: string;
    mayNeedLi3: string;
    mayNeedFootnote: string;
    disclaimerShort: string;
    modalTitle: string;
    modalBody: string;
    modalCancel: string;
    guestConnectHint: string;
    nonVictimRoleHint: string;
    openAdvocateDashboard: string;
  };

  eligibility: {
    introQualify: string;
    purposeText: string;
    questionOf: string;
    q1: {
      title: string;
      question: string;
      options: {
        victim18Own: string;
        parentMinor: string;
        parentDisabled: string;
        paidExpenses: string;
        none: string;
      };
      helper: string;
    };
    q2: {
      title: string;
      question: string;
      helper: string;
      yes: string;
      no: string;
      notSure: string;
    };
    q3: {
      title: string;
      question: string;
      options: {
        applicant: string;
        guardian: string;
        notSure: string;
      };
      helper: string;
    };
    q4: {
      title: string;
      question: string;
      helper: string;
      yes: string;
      no: string;
      notSure: string;
    };
    q5: {
      title: string;
      question: string;
      options: {
        haveNumber: string;
        haveAgency: string;
        dontHave: string;
      };
      helper: string;
    };
    q6: {
      title: string;
      question: string;
      options: {
        medical: string;
        funeral: string;
        counseling: string;
        notSure: string;
      };
      helper: string;
    };
    q7: {
      title: string;
      question: string;
      helper: string;
      yes: string;
      notSure: string;
      no: string;
    };
    resultEligible: {
      headline: string;
      body: string;
      cta: string;
      secondary: string;
    };
    resultNeedsAttention: {
      headline: string;
      body: string;
      checklist: string[];
      ctaReady: string;
      ctaHelp: string;
    };
    resultNotEligible: {
      headline: string;
      body: string;
      nextSteps: string[];
      cta: string;
    };
    status: {
      eligible: string;
      needsReview: string;
      notEligible: string;
      notChecked: string;
    };
    dashboard: {
      runCheck: string;
      startIntake: string;
      skipWarningTitle: string;
      skipWarningBody: string;
      continueAnyway: string;
      runCheckFirst: string;
    };
  };

  eligibilityIN: {
    introQualify: string;
    purposeText: string;
    questionOf: string;
    q1: { title: string; question: string; options: Record<string, string>; helper: string };
    q2: { title: string; question: string; helper: string; yes: string; no: string; notSure: string };
    q3: { title: string; question: string; helper: string; yes: string; no: string; notSure: string };
    q4: { title: string; question: string; helper: string; yes: string; no: string; notSure: string };
    q5: { title: string; question: string; helper: string; yes: string; no: string; notSure: string };
    q6: { title: string; question: string; helper: string; yes: string; no: string; notSure: string };
    q7: { title: string; question: string; helper: string; yes: string; no: string; notSure: string; na: string };
    resultEligible: { headline: string; body: string; cta: string; secondary: string };
    resultNeedsAttention: { headline: string; body: string; checklist: string[]; ctaReady: string; ctaHelp: string };
    resultNotEligible: { headline: string; body: string; nextSteps: string[]; cta: string };
  };

  authPanel: {
    signedInAs: string;
    signedInAsAdvocate: string;
    welcome: string;
    goToMyClients: string;
    learnHowItWorks: string;
    advocatesNote: string;

    progressTitle: string;
    stepOf: string;
    currentSection: string;
    resumeApplication: string;
    startApplication: string;
    myCases: string;

    inlineLoginTitle: string;
    emailLabel: string;
    passwordLabel: string;
    rememberMe: string;
    signingIn: string;
    signIn: string;

    newHere: string;
    createVictimAccount: string;
    workAsAdvocate: string;
    createAdvocateAccount: string;
    needHelp: string;
  };

  loginForm: {
    title: string;
    submit: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    loggingIn: string;
    createAccount: string;
    createAdvocateAccount: string;
    forgotPassword: string;
    tooManyAttempts: string;
  };

  forgotPassword: {
    title: string;
    subtitle: string;
    emailPlaceholder: string;
    submit: string;
    sending: string;
    sentHint: string;
    backToLogin: string;
  };

  resetPassword: {
    title: string;
    subtitle: string;
    newPasswordPlaceholder: string;
    confirmPasswordPlaceholder: string;
    passwordsMismatch: string;
    passwordTooShort: string;
    submit: string;
    updating: string;
    backToLogin: string;
    invalidOrExpired: string;
    invalidOrExpiredHint: string;
    requestNewLink: string;
    successTitle: string;
    successHint: string;
  };

  home: {
    hero: {
      title: string;
      subtitle: string;
      disclaimer: string;
      ctaCreateAccount: string;
      ctaMyDashboard: string;
      signInPrompt: string;
      videoTitle: string;
      demoVideoIntro: string;
    };

    newsletter: {
      title: string;
      description: string;
      placeholder: string;
      submit: string;
      submitting: string;
      subscribed: string;
      thanks: string;
      error: string;
    };

    guidedPath: {
      title: string;
      badge: string;
      step1: { title: string; body: string };
      step2: { title: string; body: string };
      step3: { title: string; body: string };
      quote: string;
    };

    trustBar: {
      title: string;
      badge1: string;
      badge2: string;
      badge3: string;
      badge4: string;
    };

    features: {
      title: string;
      f1: { title: string; body: string };
      f2: { title: string; body: string };
      f3: { title: string; body: string };
      f4: { title: string; body: string };
      f5: { title: string; body: string };
      f6: { title: string; body: string };
    };

    audience: {
      title: string;
      subtitle: string;
      tabs: {
        victims: string;
        advocates: string;
        caseManagers: string;
        communityOrgs: string;
        hospitals: string;
        government: string;
      };
      bullets: {
        victims: { b1: string; b2: string; b3: string };
        advocates: { b1: string; b2: string; b3: string };
        caseManagers: { b1: string; b2: string; b3: string };
        communityOrgs: { b1: string; b2: string; b3: string };
        hospitals: { b1: string; b2: string; b3: string };
        government: { b1: string; b2: string; b3: string };
      };
    };

    transparency: {
      title: string;
      body: string;
      b1: string;
      b2: string;
      b3: string;
      b4: string;
    };

    state: {
      title: string;
      body: string;
      selectLabel: string;
      optionIL: string;
      optionComingSoon: string;
    };

    privacy: {
      title: string;
      b1: string;
      b2: string;
      b3: string;
      b4: string;
    };

    multilingual: {
      bold: string;
      body: string;
      badge: string;
    };

    footer: {
      rights: string;
      disclaimer: string;
      links: {
        resourceLibrary: string;
        forVictims: string;
        privacySecurity: string;
        terms: string;
        crisis988: string;
      };
    };

    // IMPORTANT: include this only if it exists in en.ts
    nxtGuide?: {
      title: string;
      subtitle: string;
      body: string;
      button: string;
    };
  };

  intake: {
    stepOf: string;
    reassurance: string;
    header: {
      badge: string;
      title: string;
      subtitle: string;
      needMoreContext: string;
      learnLink: string;
    };

    steps: {
      victim: string;
      applicant: string;
      crime: string;
      losses: string;
      medical: string;
      employment: string;
      funeral: string;
      documents: string;
      summary: string;
    };

    errors: {
      missingCaseId: string;
      missingCaseIdShort: string;
    };

    actions: {
      back: string;
      save: string;
      saving: string;
      autoSaving: string;
      creatingCase: string;
      viewOnlyTitle: string;
      continueToStep: string;
      goToStep: string;
      reviewComplete: string;
      continue: string;
      saveAndExit: string;
      reviewSubmit: string;
    };

    viewOnly: string;
    viewOnlyBanner: string;

    footer: {
      draftDisclaimer: string;
    };

    summary: {
      alreadyFinalReview: string;
    };

    startFailed: string;
    missingCaseId: string;
    started: string;

    loadCase: {
      failed: string;
      unexpected: string;
    };

    save: {
      viewOnly: string;
      noCaseLoaded: string;
      saved: string;
      failed: string;
    };

    pdf: {
      summaryFailed: string;
      summaryUnexpected: string;
      officialFailed: string;
      officialUnexpected: string;
    };

    safeMode: {
      takeYourTime: string;
      crimeDescription: string;
      injuryDescription: string;
      optionalDetail: string;
    };

    skipForNow: string;
    answerLater: string;

    explainThis: string;
    explainThisNeedHelp: string;

    review: {
      missing: string;
      skipped: string;
      deferred: string;
      editSection: string;
      completenessNote: string;
    };

    validation: {
      victimRequired: string;
      crimeMinimumRequired: string;
      certificationRequired: string;
    };

    confirm: {
      noLossesSelected: string;
      lossOfEarningsNoEmployer: string;
      funeralSelectedNoData: string;
    };

    saveCase: {
      failed: string;
      missingId: string;
      unexpected: string;
    };
  };

  fields: {
    firstName: { required: string };
    lastName: { required: string };
    dateOfBirth: { required: string };

    cellPhone: { label: string; placeholder: string };

    streetAddress: { required: string };
    apt: { label: string };

    city: { required: string };
    state: { required: string };
    zip: { required: string };

    email: { label: string };
    alternatePhone: { label: string };

    genderIdentity: { optional: string; placeholder: string };
    race: { optional: string; placeholder: string };
    ethnicity: { optional: string; placeholder: string };

    hasDisability: { question: string };

    disabilityType: {
      physical: string;
      mental: string;
      developmental: string;
      other: string;
    };
  };

  nxtGuide: {
    title: string;
    subtitle: string;
    close: string;
    typing: string;

    empty: {
      title: string;
      q1: string;
      q2: string;
      q3: string;
    };

    placeholders: {
      thinking: string;
      ask: string;
    };

    cta: {
      needHelp: string;
      chatWith: string;
    };

    floating: {
      needHelpOnThisStep: string;
    };

    errors: {
      respondFailed: string;
      technicalProblem: string;
    };
  };
  
  ui: {
    buttons: {
      back: string;
      next: string;
      continue: string;
      cancel: string;
      close: string;
      save: string;
      saving: string;
      submit: string;
      submitting: string;
      edit: string;
      done: string;
      confirm: string;
      download: string;
      upload: string;
      remove: string;
      retry: string;
      refresh: string;
    };

    status: {
      optional: string;
      required: string;
      yes: string;
      no: string;
      none: string;
      unknown: string;
      notProvided: string;
    };

    errors: {
      generic: string;
      network: string;
      unauthorized: string;
      notFound: string;
    };

    toasts: {
      saved: string;
      updated: string;
      copied: string;
      uploaded: string;
      removed: string;
    };

    modals: {
      confirmTitle: string;
      areYouSure: string;
    };
  };

forms: {
  int: {
    whoIsSubmitting: string;
    whoOptions: Record<string, string>;
    last4SSN: string;
    autoAccident: string;
    autoInsuranceName: string;
    physicalInjuries: string;
    medicalFacilityName: string;
    timeOfCrime: string;
    crimeType: string;
    causeNumber: string;
    willingToAssistProsecution: string;
    notWillingExplain: string;
    compensationRequesting: string;
    medicalDentalCounseling: string;
    lossOfIncome: string;
    funeralBurial: string;
    lossOfSupport: string;
    other: string;
    otherDescribe: string;
  };
  victim: {
    title: string;
    description: string;
    civilRightsNote: string;
    disabilityTypesLabel: string;
  };

  labels: {
    firstName: string;
    lastName: string;
    middleName: string;
    dateOfBirth: string;
    email: string;
    phone: string;
    address: string;
    unit: string;
    city: string;
    state: string;
    zip: string;
    county: string;
    country: string;
    relationship: string;
    notes: string;
  };

  placeholders: {
    selectOne: string;
    typeHere: string;
    search: string;
  };

  validation: {
    required: string;
    invalidEmail: string;
    invalidPhone: string;
    invalidZip: string;
    minChars: string;
    maxChars: string;
  };

  documents: {
    title: string;
    description: string;
    descriptionDraft: string;

    loadFailed: string;
    noDraft: string;

    saveContinue: string;

    coreTitle: string;
    otherTitle: string;

    checklist: {
      policeReport: string;
      medicalBills: string;
      counselingBills: string;
      funeralInvoices: string;
      wageProof: string;
      idProof: string;
    };

    otherEmpty: string;
    otherItemTitle: string; // {n}
    otherLabel: string;
    otherPlaceholder: string;
    otherHaveIt: string;
    otherNotYet: string;

    addOther: string;

    notesLabel: string;
    notesHint: string;

    stepTitle: string;
    viewOnlyBanner: string;
    intro: string;
    bullets: {
      police: string;
      medical: string;
      funeral: string;
      wages: string;
      other: string;
    };
    disclaimer: string;
    goToUploadPage: string;
    uploader: {
      title: string;
      helper: string;
      shortDescriptionLabel: string;
      shortDescriptionPlaceholder: string;
      uploadLabel: string;
    };
  };

  applicant: {
    title: string;
    description: string;
    isVictimAlsoApplicantLabel: string;
    sameAsVictimNote: string;

    options: {
      victim: string;
      proxy: string;
    };

    relationshipPlaceholder: string;

    legalGuardianship: {
      question: string;
      noNotSure: string;
    };

    seekingOwnExpenses: {
      question: string;
    };
    descriptionOfExpensesSought: {
      label: string;
      placeholder: string;
    };
  };

  employment: {
    title: string;
    description: string;
    descriptionDraft: string;

    loadFailed: string;
    noDraft: string;

    saveContinue: string;

    unknownHint: string;

    employedAtTimeLabel: string;
    employerNameLabel: string;
    employerNamePlaceholder: string;
    employerPhoneLabel: string;
    employerPhonePlaceholder: string;
    employerAddressLabel: string;
    employerAddressPlaceholder: string;

    missedWorkLabel: string;
    missedWorkFromLabel: string;
    missedWorkToLabel: string;

    disabilityFromCrimeLabel: string;
  };

  employmentExtended: {
    title: string;
    description: string;

    fields: {
      employerNameLabel: string;
      employerAddressLabel: string;
      employerPhoneLabel: string;
      netMonthlyWagesLabel: string;
      netMonthlyWagesPlaceholder: string;
    };

    benefits: {
      question: string;
      notesLabel: string;
      sickPayLabel: string;
      vacationPayLabel: string;
      personalTimeLabel: string;
      disabilityPayLabel: string;
      otherBenefitLabel: string;
    };

    noNotSure: string;

    footerNote: string;

    uploaderContextLabel: string;
  };

  court: {
    title: string;
    description: string;

    noNotSure: string;

    offenderArrestedQuestion: string;
    offenderChargedQuestion: string;
    applicantTestifiedQuestion: string;

    criminalCaseNumberLabel: string;
    criminalCaseOutcomeLabel: string;
    criminalCaseOutcomePlaceholder: string;

    restitutionOrderedQuestion: string;
    restitutionAmountLabel: string;
    restitutionAmountPlaceholder: string;

    humanTraffickingQuestion: string;
    humanTraffickingTestifiedQuestion: string;
    humanTraffickingCaseNumberLabel: string;
    humanTraffickingCaseOutcomeLabel: string;
  };

  contact: {
    title: string;
    description: string;
    prefersEnglishQuestion: string;
    preferredLanguageLabel: string;
    preferredLanguagePlaceholder: string;
    workingWithAdvocateQuestion: string;
    advocateNameLabel: string;
    advocatePhoneLabel: string;
    advocateOrganizationLabel: string;
    advocateEmailLabel: string;
    consentToTalkToAdvocateQuestion: string;
    alternateContactQuestion: string;
    alternateContactNameLabel: string;
    alternateContactPhoneLabel: string;
    alternateContactRelationshipLabel: string;
  };

  funeral: {
    title: string;
    description: string;
    descriptionDraft: string;

    loadFailed: string;
    noDraft: string;

    saveContinue: string;

    unknownHint: string;

    victimDeceasedLabel: string;

    funeralHomeTitle: string;
    funeralHomeNameLabel: string;
    funeralHomeNamePlaceholder: string;
    funeralHomePhoneLabel: string;
    funeralHomePhonePlaceholder: string;

    dependentsTitle: string;
    hasDependentsLabel: string;
    hasDependentsHint: string;
    dependentsCountLabel: string;
    dependentsCountPlaceholder: string;
    dependentsNotesLabel: string;
    dependentsNotesPlaceholder: string;
  };

  funeralExtended: {
    title: string;
    description: string;

    funeralHome: {
      nameLabel: string;
      phoneLabel: string;
      billTotalLabel: string;
    };

    cemetery: {
      title: string;
      nameLabel: string;
      phoneLabel: string;
      billTotalLabel: string;
    };

    payer: {
      title: string;
      nameLabel: string;
      relationshipLabel: string;
      relationshipPlaceholder: string;
      amountPaidLabel: string;
    };

    esvf: {
      question: string;
      amountLabel: string;
    };

    lifeInsurance: {
      question: string;
      companyLabel: string;
      beneficiaryNameLabel: string;
      beneficiaryPhoneLabel: string;
      amountPaidLabel: string;
    };

    dependents: {
      title: string;
      nameLabel: string;
      relationshipLabel: string;
      relationshipPlaceholder: string;
      dobLabel: string;
      guardianLabel: string;
    };

    placeholders: {
      moneyExample8000: string;
      moneyExample2000: string;
      moneyExample1500: string;
      moneyExample10000: string;
    };

    noNotSure: string;

    footerNote: string;

    uploaderContextLabel: string;

    deathBenefits: {
      title: string;
      description: string;
      deathBenefitChicagoFundLabel: string;
      lifeHealthAccidentInsuranceLabel: string;
      unemploymentPaymentsLabel: string;
      veteransSocialSecurityBurialLabel: string;
      workersCompDramShopLabel: string;
      federalMedicarePublicAidLabel: string;
    };
  };

  losses: {
    title: string;
    description: string;

    options: {
      medical: string;
      counseling: string;
      lostWages: string;
      funeral: string;
      propertyLoss: string;
      relocation: string;
      other: string;
    };

    otherLabel: string;
  };

  lossesExtended: {
    title: string;
    description: string;

    groups: {
      medical: { title: string };
      work: { title: string };
      funeralProperty: { title: string };
      personalOther: { title: string };
    };

    items: {
      medicalHospital: string;
      dental: string;
      counseling: string;
      transportation: string;
      accessibilityCosts: string;
      temporaryLodging: string;
      relocationCosts: string;

      lossOfEarnings: string;
      lossOfSupport: string;
      lossOfFutureEarnings: string;
      replacementServiceLoss: string;
      tuition: string;

      funeralBurial: string;
      headstone: string;
      crimeSceneCleanup: string;
      towingStorage: string;
      securityRepairs: string;

      evidenceClothingBedding: string;
      assistiveItems: string;
      replacementCosts: string;
      legalFees: string;
      tattooRemoval: string;
    };

    footerNote: string;
  };

  medical: {
    title: string;
    description: string;
    descriptionDraft: string;

    loadFailed: string;
    noDraft: string;

    saveContinue: string;

    hints: {
      unknownOk: string;
      dateFormat: string;
    };

    sections: {
      medical: string;
      counseling: string;
    };

    questions: {
      hasMedicalTreatment: string;
      hasCounseling: string;
    };

    fields: {
      hospitalName: string;
      hospitalCity: string;
      treatmentStart: string;
      treatmentEnd: string;
      providerName: string;
      sessionsCount: string;
    };

    placeholders: {
      hospitalName: string;
      hospitalCity: string;
      providerName: string;
      sessionsCount: string;
    };
  };

  medicalExtended: {
    title: string;
    description: string;

    fields: {
      providerNameLabel: string;
      cityLabel: string;
      phoneLabel: string;
      serviceDatesLabel: string;
      amountLabel: string;
      amountPlaceholder: string;
    };

    otherSources: {
      question: string;
      descriptionLabel: string;
    };

    noNotSure: string;

    footerNote: string;

    uploaderContextLabel: string;
  };

  crime: {
    title: string;
    description: string;

    incidentDateLabel: string;
    incidentTimeLabel: string;
    incidentTimePlaceholder: string;

    locationAddressLabel: string;

    policeReportedLabel: string;
    policeDepartmentLabel: string;
    policeReportNumberLabel: string;

    offenderKnownLabel: string;
    offenderNameLabel: string;

    narrativeLabel: string;
    narrativePlaceholder: string;

    sectionTitle: string;
    sectionDescription: string;

    dateOfCrimeLabel: string;
    dateReportedLabel: string;

    crimeAddressLabel: string;

    crimeCityLabel: string;
    crimeCountyLabel: string;

    reportingAgencyLabel: string;
    reportingAgencyPlaceholder: string;

    policeReportNumberHelp: string;

    crimeDescriptionLabel: string;
    crimeDescriptionPlaceholder: string;

    injuryDescriptionLabel: string;
    injuryDescriptionPlaceholder: string;

    offenderKnownQuestion: string;
    noNotSure: string;

    offenderNamesLabel: string;

    offenderRelationshipLabel: string;
    offenderRelationshipPlaceholder: string;

    sexualAssaultKitQuestion: string;

    uploaderContextLabel: string;
  };

  summary: {
    title: string;
    description: string;
    descriptionDraft: string;

    loadFailed: string;
    noDraft: string;

    save: string;

    quickTitle: string;
    quickDescription: string;

    viewOnlyBanner: string;

    placeholders: {
      none: string;
      notProvided: string;
      relationshipNotSet: string;
      alreadyFinalReview: string;
    };

    checkpoint: {
      progressTitle: string;
      progressHint: string;
      missingTitle: string;
      missingExplainer: string;
      missingEmpty: string;
      deferredTitle: string;
      deferredExplainer: string;
      deferredEmpty: string;
      nextStepTitle: string;
      applicationDetailsTitle: string;
      applicationDetailsToggle: string;
      documentsTitle: string;
      documentsSubtitle: string;
      documentsEmpty: string;
      uploadDocuments: string;
      uploadMissingDocuments: string;
      messagesTitle: string;
      messagesSubtitle: string;
      messagesEmpty: string;
      /** Intake summary: secure messages moved to /victim/messages */
      messagesOpenTool: string;
      messagesOpenToolCta: string;
      appointmentsTitle: string;
      appointmentsSubtitle: string;
      appointmentsEmpty: string;
      appointmentsCta: string;
      recommendedTitle: string;
      whatNextTitle: string;
      whatNextIncomplete: string;
      whatNextMaybeDocsAndMessages: string;
      whatNextSupportOrgs: string;
      whatNextAllClear: string;
      viewMessages: string;
    };

    actions: {
      downloadSummaryPdf: string;
      downloadOfficialIlPdf: string;
      downloadOfficialIl: string;
      downloadOfficialIn: string;
      saveCaseForAdvocateReview: string;
      saveCaseForAdvocate: string;
      inviteAdvocate: string;
      close: string;
      sendInvite: string;
      inviting: string;
    };

    invite: {
      title: string;
      note: string;
      advocateEmailLabel: string;
      advocateEmailPlaceholder: string;
      allowEdit: string;

      results: {
        saveCaseFirst: string;
        mustBeLoggedIn: string;
        unexpected: string;
        accessGranted: string;
      };

      errors: {
        saveCaseFirst: string;
        mustBeLoggedIn: string;
        unexpected: string;
      };

      success: {
        accessGranted: string;
      };
    };

    snapshots: {
      victimTitle: string;
      applicantTitle: string;
      applicantSamePerson: string;

      crimeTitle: string;
      crime: {
        dateOfCrime: string;
        location: string;
        cityCounty: string;
        reportedTo: string;
        policeReportNumber: string;
      };

      lossesTitle: string;
      lossesNone: string;

      medicalTitle: string;
      medical: {
        provider: string;
        cityPhone: string;
        serviceDates: string;
        approxBillAmount: string;
        noneEntered: string;
      };

      workTitle: string;
      work: {
        employer: string;
        employerPhone: string;
        netMonthlyWages: string;
        noneEntered: string;
      };

      funeralTitle: string;
      funeral: {
        funeralHome: string;
        funeralHomePhone: string;
        totalFuneralBill: string;
        payer: string;
        amountPaidSoFar: string;
        noPayer: string;
        noneEntered: string;
      };
    };

    crime: {
      title?: string;
      dateOfCrime: string;
      location: string;
      cityCounty: string;
      reportedTo: string;
      policeReportNumber: string;
      fields?: {
        dateOfCrime: string;
        location: string;
        cityCounty: string;
        reportedTo: string;
        policeReportNumber: string;
      };
    };

    medicalSnapshot: {
      title: string;
      fields: {
        provider: string;
        cityPhone: string;
        serviceDates: string;
        approxBillAmount: string;
      };
      noneEntered: string;
    };

    employmentSnapshot: {
      title: string;
      fields: {
        employer: string;
        employerPhone: string;
        netMonthlyWages: string;
      };
      noneEntered: string;
    };

    funeralSnapshot: {
      title: string;
      fields: {
        funeralHome: string;
        funeralHomePhone: string;
        totalFuneralBill: string;
        payer: string;
        amountPaidSoFar: string;
      };
      noPayer: string;
      noneEntered: string;
    };

    certificationUi: {
      title: string;
      checks: {
        subrogation: string;
        release: string;
        perjury: string;
      };
      signatureLabel: string;
      dateLabel: string;

      attorney: {
        question: string;
        yes: string;
        no: string;

        name: string;
        ardc: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        phone: string;
        email: string;
      };
    };

    certification: {
      title: string;
      checks: {
        subrogation: string;
        release: string;
        perjury: string;
      };
      signatureLabel: string;
      dateLabel: string;
      attorney: {
        question: string;
        name: string;
        ardc: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        phone: string;
        email: string;
      };
    };

    sections: {
      victim: string;
      applicant: string;
      crime: string;
      losses: string;
      medical: string;
      employment: string;
      funeral: string;
      documents: string;
      certification: string;
    };

    labels: {
      name: string;
      dob: string;
      phone: string;
      email: string;
      address: string;
      isVictimAlsoApplicant: string;
      relationshipToVictim: string;
      date: string;
      time: string;
      location: string;
      reportedToPolice: string;
      policeDepartment: string;
      reportNumber: string;
      to: string;
    };

    losses: {
      noneSelected: string;
      medical: string;
      counseling: string;
      funeral: string;
      lostWages: string;
      relocation: string;
      propertyLoss: string;
      other: string;
      otherYes: string;
      estimatedTotal: string;
      medicalHospital: string;
      dental: string;
      transportation: string;
      accessibilityCosts: string;
      crimeSceneCleanup: string;
      relocationCosts: string;
      temporaryLodging: string;
      tattooRemoval: string;
      lossOfEarnings: string;
      tuition: string;
      replacementServiceLoss: string;
      locks: string;
      windows: string;
      clothing: string;
      bedding: string;
      prostheticAppliances: string;
      eyeglassesContacts: string;
      hearingAids: string;
      replacementCosts: string;
      lossOfSupport: string;
      towingStorage: string;
      funeralBurial: string;
      lossOfFutureEarnings: string;
      legalFees: string;
      doors: string;
      headstone: string;
    };

    medical: {
      medicalTreatment: string;
      hospital: string;
      city: string;
      treatmentDates: string;
      counseling: string;
      provider: string;
      sessions: string;
      cityPhone: string;
      serviceDates: string;
      amount: string;
      noneEntered: string;
    };

    employment: {
      employedAtTime: string;
      employer: string;
      missedWork: string;
      missedDates: string;
      disabilityFromCrime: string;
      employerPhone: string;
      netMonthlyWages: string;
      noneEntered: string;
    };

    funeral: {
      victimDeceased: string;
      funeralHome: string;
      funeralPhone: string;
      funeralHomePhone: string;
      dependentsPresent: string;
      dependentCount: string;
      dependentNotes: string;
      payer: string;
      noPayer: string;
      totalBill: string;
      amountPaid: string;
      relationshipNotSet: string;
      noneEntered: string;
    };

    documents: {
      policeReports: string;
      medicalBills: string;
      counselingBills: string;
      funeralBills: string;
      wageProof: string;
      other: string;
      notes: string;
    };

    applicant: {
      samePerson: string;
    };

    certificationText: {
      disclaimer: string;
      fullNameLabel: string;
      fullNamePlaceholder: string;
      dateLabel: string;
      truthfulLabel: string;
      releaseLabel: string;
    };
  };
};

  accountAdvocate: {
    title: string;
    intro: string;
    privacyNote: string;
    organizationSection: string;
    organizationHelp: string;
    organizationName: string;
    organizationEmpty: string;
    identitySection: string;
    preferredName: string;
    legalFirstName: string;
    legalLastName: string;
    jobTitle: string;
    workLocationSection: string;
    workCity: string;
    workState: string;
    workZip: string;
    contactSection: string;
    workPhone: string;
    workPhoneExt: string;
    alternatePhone: string;
    preferredContactMethod: string;
    contactSelect: string;
    contactEmail: string;
    contactPhone: string;
    contactSms: string;
    safeToLeaveVoicemail: string;
    interpreterYes: string;
    interpreterNo: string;
    interpreterUnspecified: string;
    languagesSection: string;
    languages: string;
    languagesPlaceholder: string;
    save: string;
    saving: string;
    saved: string;
    saveError: string;
    notSignedIn: string;
  };

  accountPersonal: {
    title: string;
    intro: string;
    privacyNote: string;
    identitySection: string;
    demographicsSection: string;
    addressSection: string;
    contactSection: string;
    otherSection: string;
    preferredName: string;
    legalFirstName: string;
    legalLastName: string;
    pronouns: string;
    genderIdentity: string;
    dateOfBirth: string;
    ethnicity: string;
    race: string;
    streetAddress: string;
    apt: string;
    city: string;
    state: string;
    zip: string;
    cellPhone: string;
    alternatePhone: string;
    preferredContactMethod: string;
    contactEmail: string;
    contactPhone: string;
    contactSms: string;
    contactAny: string;
    safeToLeaveVoicemail: string;
    occupation: string;
    educationLevel: string;
    primaryLanguage: string;
    interpreterNeeded: string;
    interpreterYes: string;
    interpreterNo: string;
    interpreterUnspecified: string;
    disabilityOrAccessNeeds: string;
    eduLessThanHs: string;
    eduHsGed: string;
    eduSomeCollege: string;
    eduAssociates: string;
    eduBachelors: string;
    eduGraduate: string;
    eduPreferNot: string;
    eduSelect: string;
    save: string;
    saving: string;
    saved: string;
    loadError: string;
    saveError: string;
    notSignedIn: string;
  };
};