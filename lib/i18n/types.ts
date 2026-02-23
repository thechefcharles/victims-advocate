// lib/i18n/types.ts
export type I18nDict = {
  nav: {
    dashboardVictim: string;
    dashboardAdvocate: string;
    login: string;
    logout: string;
    language: string;
    brandTagline: string;
  };

  common: {
    loading: string;
    refresh: string;
    refreshing: string;
    backToHome: string;
    yes: string;
    no: string;
  };

  eligibility: {
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
};