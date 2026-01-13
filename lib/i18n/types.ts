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

    trustBar: { title: string; badge1: string; badge2: string; badge3: string; badge4: string };

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

    transparency: { title: string; body: string; b1: string; b2: string; b3: string; b4: string };

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
};