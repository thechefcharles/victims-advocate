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

  authPanel: {
    signedInAs: string;
    signedInAsAdvocate: string;
    welcome: string;
    goToMyClients: string;
    learnHowItWorks: string;
    advocatesNote: string;

    progressTitle: string;
    stepOf: string; // supports tokens like {current} and {total}
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

  home: {
    hero: { title: string; subtitle: string; disclaimer: string };

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

    privacy: { title: string; b1: string; b2: string; b3: string; b4: string };

    multilingual: { bold: string; body: string; badge: string };

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
  };

  intake: {
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

    viewOnly: string;
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
    empty: { title: string; q1: string; q2: string; q3: string };
    placeholders: { thinking: string; ask: string };
    cta: { needHelp: string; chatWith: string };
    errors: { respondFailed: string; technicalProblem: string };
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
  };
};