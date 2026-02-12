// lib/i18n/en.ts
import type { I18nDict } from "./types";

export const en: I18nDict = {
  /* =========================
     NAV / COMMON
  ========================== */
  nav: {
    dashboardVictim: "My cases",
    dashboardAdvocate: "My clients",
    login: "Log in",
    logout: "Log out",
    language: "Language",
    brandTagline: "Victim Support · Made Simple",
  },

  common: {
    loading: "Loading…",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    backToHome: "← Back to home",
    yes: "Yes",
    no: "No",
  },

  /* =========================
     ELIGIBILITY CHECK
  ========================== */
  eligibility: {
    purposeText:
      "This short check helps confirm whether you can apply for Illinois Crime Victims Compensation and whether you're ready to start. It does not submit an application and does not affect your eligibility.",
    questionOf: "Question {current} of {total}",
    q1: {
      title: "Who is applying?",
      question: "Which option best describes you?",
      options: {
        victim18Own:
          "I am the victim, I am 18 or older, and I am applying for my own expenses",
        parentMinor: "I am the parent or legal guardian of a victim who is under 18",
        parentDisabled:
          "I am the parent or legal guardian of a victim under a legal disability",
        paidExpenses:
          "I paid or became legally responsible for paying the victim's medical, hospital, funeral, or burial expenses",
        none: "None of these / I'm not sure",
      },
      helper:
        "Illinois law limits who can submit an application. This question helps confirm whether you're allowed to apply.",
    },
    q2: {
      title: "Victim age or legal status",
      question: "Is the victim under 18 years old or under a legal disability?",
      helper:
        "If the victim is under 18 or under a legal disability, the application must be completed and signed by a parent or legal guardian.",
      yes: "Yes",
      no: "No",
      notSure: "I'm not sure",
    },
    q3: {
      title: "Who will sign the application?",
      question: "Who will sign the application?",
      options: {
        applicant: "I will sign as the applicant",
        guardian: "I am the parent or legal guardian and will sign on the victim's behalf",
        notSure: "I'm not sure or I can't get the required signature",
      },
      helper:
        "The application must be signed by the applicant or, if the victim is under 18 or under a legal disability, by a parent or legal guardian.",
    },
    q4: {
      title: "Police report",
      question: "Was the crime reported to law enforcement?",
      helper:
        "The Attorney General's Office will request a police report to investigate the claim. If you don't have one now, you can still continue.",
      yes: "Yes",
      no: "No",
      notSure: "I'm not sure",
    },
    q5: {
      title: "Police report details",
      question: "Do you have any police report information?",
      options: {
        haveNumber: "Yes, I have the police report number",
        haveAgency:
          "I know the police department or agency, but not the report number",
        dontHave: "I don't have this information yet",
      },
      helper:
        "If you don't have the report number, you'll be asked to provide as much information as you can about the crime later.",
    },
    q6: {
      title: "Expenses related to the crime",
      question: "What expenses are you seeking reimbursement for?",
      options: {
        medical: "Medical or hospital expenses",
        funeral: "Funeral or burial expenses",
        counseling: "Counseling or other crime-related expenses",
        notSure: "I'm not sure yet",
      },
      helper:
        "Compensation is limited to certain expenses related to the crime. You do not need final bills to complete this check.",
    },
    q7: {
      title: "Staying in contact",
      question:
        "Can you reliably receive mail or phone calls and return requested documents within 45 days?",
      helper:
        "After you apply, the Attorney General's Office may request additional forms or documents. If they can't reach you or documents aren't returned within 45 days, the claim may be closed.",
      yes: "Yes",
      notSure: "I'm not sure",
      no: "No",
    },
    resultEligible: {
      headline: "You appear eligible to apply.",
      body: "Based on your answers, you meet the basic requirements to submit an Illinois Crime Victims Compensation application.",
      cta: "Start Application",
      secondary: "You can save your progress and return at any time.",
    },
    resultNeedsAttention: {
      headline: "You may be eligible, but a few things need attention first.",
      body: "You can apply, but missing information or contact issues may delay or prevent payment.",
      checklist: [
        "Confirm who will sign the application",
        "Gather police report information (if available)",
        "Make sure your address and phone number are reliable",
        "Be prepared to return requested documents within 45 days",
      ],
      ctaReady: "Continue When Ready",
      ctaHelp: "Get Help From an Advocate",
    },
    resultNotEligible: {
      headline:
        "You may not be eligible to apply under Illinois Crime Victims Compensation rules.",
      body: "Only certain individuals are allowed to submit an application, such as the victim (18+), a parent or legal guardian of a minor or disabled victim, or someone who paid qualifying expenses.",
      nextSteps: [
        "If you believe someone else should apply, ask them to complete the application",
        "If you need help or referrals, contact the Illinois Attorney General's Office at 1-800-228-3368",
      ],
      cta: "Find Other Support Options",
    },
    status: {
      eligible: "Eligible",
      needsReview: "Needs review",
      notEligible: "Not eligible",
      notChecked: "Not checked",
    },
    dashboard: {
      runCheck: "Run eligibility check",
      startIntake: "Start intake",
      skipWarningTitle: "Run eligibility check first?",
      skipWarningBody:
        "The eligibility check helps confirm you can apply and what to expect. We recommend running it before starting the intake form.",
      continueAnyway: "Continue to intake anyway",
      runCheckFirst: "Run eligibility check first",
    },
  },

  /* =========================
     AUTH PANEL / LOGIN
  ========================== */
  authPanel: {
    signedInAs: "Signed in as",
    signedInAsAdvocate: "Signed in as Advocate",
    welcome: "Welcome",
    goToMyClients: "Go to My clients →",
    learnHowItWorks: "Learn how it works",
    advocatesNote:
      "Advocates don’t fill out applications here — victims share cases with you for review.",

    progressTitle: "Your application progress",
    stepOf: "Step {current} of {total}",
    currentSection: "Current section:",
    resumeApplication: "Resume application",
    startApplication: "Start application",
    myCases: "My cases",

    inlineLoginTitle: "Let's get you signed in",
    emailLabel: "Email",
    passwordLabel: "Password",
    rememberMe: "Remember me",
    signingIn: "Signing in…",
    signIn: "Sign in",

    newHere: "New here?",
    createVictimAccount: "Create victim account",
    workAsAdvocate: "Work as an advocate?",
    createAdvocateAccount: "Create victim advocate account",
    needHelp: "Need help?",
  },

  loginForm: {
    title: "Log in",
    submit: "Log in",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    loggingIn: "Logging in…",
    createAccount: "Create account",
    createAdvocateAccount: "Create Victim Advocate account",
    forgotPassword: "Forgot password",
  },

  /* =========================
     HOME PAGE
  ========================== */
  home: {
    hero: {
      title: "Crime Victim Support",
      subtitle: "Apply for victim compensation today.",
      disclaimer:
        "NxtStps is a supportive tool. It does not replace legal advice, emergency services, or medical care. You can pause at any time and return when you're ready.",
    },

    guidedPath: {
      title: "NxtStps Guided Path",
      badge: "Draft preview",
      step1: {
        title: "Tell us what happened",
        body: "We ask one question at a time in calm, clear language.",
      },
      step2: {
        title: "Collect & pre-check your documents",
        body:
          "Upload police reports, medical bills, and other proof. We scan for missing or mismatched details.",
      },
      step3: {
        title: "File with confidence",
        body:
          "You review a clean draft packet before anything is sent to the state.",
      },
      quote:
        "“You don't have to figure this out alone. NxtStps walks with you, step by step, at your pace.”",
    },

    trustBar: {
      title: "Built for the real victim-services ecosystem",
      badge1: "Built with victim advocates & case managers",
      badge2: "Aligned with state compensation rules",
      badge3: "AI-powered denial-prevention engine",
      badge4: "Secure, encrypted, confidential",
    },

    features: {
      title: "What NxtStps helps you with",
      f1: {
        title: "Eligibility checker",
        body:
          "Answers a few key questions and gently explains if you may qualify, why, and what to do next.",
      },
      f2: {
        title: "Denial-prevention engine",
        body:
          "Maps the most common denial reasons to automated checks that catch problems before you file.",
      },
      f3: {
        title: "Automatic document organizer",
        body:
          "Police reports, medical bills, funeral invoices, and wage proof—structured and ready for review.",
      },
      f4: {
        title: "Application builder",
        body:
          "Transforms the state’s complex forms into plain-language steps with examples and explanations.",
      },
      f5: {
        title: "Multilingual advocate chatbot",
        body:
          "NxtGuide explains the process in your preferred language, asks questions gently, and stays trauma-informed.",
      },
      f6: {
        title: "State-by-state support",
        body:
          "Adapts to each state’s categories, documentation rules, and deadlines so your application stays compliant.",
      },
    },

    audience: {
      title: "Who NxtStps supports",
      subtitle:
        "NxtStps is designed for everyone who touches the victim-services journey—from survivors themselves to advocates, hospitals, and state agencies.",
      tabs: {
        victims: "Victims",
        advocates: "Advocates",
        caseManagers: "Case Managers",
        communityOrgs: "Community Organizations",
        hospitals: "Hospitals & Medical Providers",
        government: "Government Departments",
      },
      bullets: {
        victims: {
          b1: "Understand your rights in clear, human language.",
          b2: "Apply confidently with step-by-step guidance.",
          b3: "Avoid common mistakes that delay or deny claims.",
        },
        advocates: {
          b1: "Streamline caseloads with automated workflows.",
          b2: "Reduce incomplete submissions and preventable errors.",
          b3: "Maintain trauma-informed care while saving significant time.",
        },
        caseManagers: {
          b1: "Manage complex cases with organized documentation.",
          b2: "Track application status across clients in one place.",
          b3: "Ensure accuracy, compliance, and timely follow-through.",
        },
        communityOrgs: {
          b1: "Centralize victim-support work across outreach and advocacy.",
          b2: "Improve internal coordination and warm hand-offs.",
          b3: "Access aggregate reporting to strengthen funding.",
        },
        hospitals: {
          b1: "Simplify bill submission and verification workflows.",
          b2: "Reduce burden on social workers and billing teams.",
          b3: "Help patients access financial assistance quickly.",
        },
        government: {
          b1: "Receive cleaner, more complete applications.",
          b2: "Reduce backlogs by standardizing error-free packets.",
          b3: "Increase transparency, compliance, and public trust.",
        },
      },
    },

    transparency: {
      title: "Victim services should be fast, clear, and fair.",
      body:
        "NxtStps eliminates confusion, missing documents, and preventable denials—giving survivors and advocates a stable, transparent path to support.",
      b1: "No hidden fees.",
      b2: "No judgment.",
      b3: "No confusing legal language.",
      b4: "Built for accuracy, dignity, and equity.",
    },

    state: {
      title: "Tailored to your state",
      body:
        "NxtStps will support multiple states. For now, we're focused on Illinois Crime Victims Compensation—but the architecture is ready to expand.",
      selectLabel: "Select your state (preview)",
      optionIL: "Illinois (current focus)",
      optionComingSoon: "More states coming soon…",
    },

    privacy: {
      title: "Safety & privacy, by design",
      b1: "Your information is encrypted in transit and at rest.",
      b2: "You control what is shared and when.",
      b3: "Nothing is submitted to the state without your consent.",
      b4: "You may pause or exit at any time.",
    },

    multilingual: {
      bold: "Multilingual support.",
      body:
        "NxtStps is being built to support 100+ languages, with instant translation and trauma-informed guidance.",
      badge: "English · Spanish · More coming soon",
    },

    footer: {
      rights: "NxtStps. All rights reserved.",
      disclaimer:
        "NxtStps is a trauma-informed digital toolkit. It does not replace legal advice, emergency services, or mental-health care.",
      links: {
        resourceLibrary: "Resource Library",
        forVictims: "For Victims",
        privacySecurity: "Privacy & Security",
        terms: "Terms",
        crisis988: "Crisis Support (988)",
      },
    },
  },

  /* =========================
     INTAKE (APPLICATION FLOW)
  ========================== */
intake: {
  header: {
    badge: "Illinois Crime Victims Compensation",
    title: "Compensation application",
    subtitle:
      "Answer what you can. You can pause anytime and come back when you're ready.",
    needMoreContext: "Need more context?",
    learnLink: "How Illinois compensation works",
  },

  steps: {
    victim: "Victim",
    applicant: "Applicant",
    crime: "Crime & incident",
    losses: "Losses & money",
    medical: "Medical & counseling",
    employment: "Work & income",
    funeral: "Funeral & dependents",
    documents: "Documents",
    summary: "Summary",
  },

  errors: {
    missingCaseId: "Missing case id in the URL.",
    missingCaseIdShort: "Missing case id.",
  },

  actions: {
    back: "Back",
    save: "Save",
    saving: "Saving…",
    autoSaving: "Auto-saving…",
    creatingCase: "Creating case…",
    viewOnlyTitle: "View-only access",
    continueToStep: "Continue to {step} →",
    goToStep: "Go to {step} →",
    reviewComplete: "Review complete",
  },

  viewOnly: "View-only access (you can’t edit this case).",
  viewOnlyBanner:
    "View-only access: you can review this case, but you can’t edit it.",

  footer: {
    draftDisclaimer: "Draft. Nothing is submitted to the state without your consent.",
  },

  summary: {
    alreadyFinalReview: "You’re already on the final review step.",
  },

  startFailed: "Couldn’t start application. Try refresh.",
  missingCaseId: "Created, but missing case ID.",
  started: "Application started",

  loadCase: {
    failed: "Could not load that case (no access or not found).",
    unexpected: "Something went wrong loading that case.",
  },

  save: {
    viewOnly: "View-only access. You can’t save changes.",
    noCaseLoaded: "No case loaded yet. Start the application first.",
    saved: "Application saved",
    failed: "Couldn’t save. Try again.",
  },

  pdf: {
    summaryFailed: "There was an issue generating the PDF. Please try again.",
    summaryUnexpected: "Something went wrong generating the PDF.",
    officialFailed:
      "There was an issue generating the official Illinois form. Please try again.",
    officialUnexpected: "Something went wrong creating the official form.",
  },

  validation: {
    victimRequired:
      "Please fill in the victim's name, date of birth, and address before continuing.",
    crimeMinimumRequired:
      "Please provide at least the date of the crime, where it happened, and which police department it was reported to.",
    certificationRequired:
      "Before saving this as a case, please review the certification section and add your name, date, and acknowledgements.",
  },

  confirm: {
    noLossesSelected:
      "You haven't selected any losses yet. Are you sure you don't want to ask for help with medical, funeral, or other costs?",
    lossOfEarningsNoEmployer:
      "You indicated loss of earnings but haven't entered any employer info yet. Continue anyway?",
    funeralSelectedNoData:
      "You indicated funeral or burial costs but haven't entered any funeral information yet. Continue anyway?",
  },

  saveCase: {
    failed: "There was a problem saving your case. Please check the console.",
    missingId: "Saved, but no case ID was returned. Check the API response.",
    unexpected: "Something went wrong saving your case. See console for details.",
  },
},

  /* =========================
     FIELD COPY (PAGE/FORM-SPECIFIC LABELS)
     NOTE: Use these keys in your components via t('fields.firstName.required'), etc.
  ========================== */
  fields: {
    firstName: { required: "First name *" },
    lastName: { required: "Last name *" },
    dateOfBirth: { required: "Date of birth *" },

    cellPhone: {
      label: "Cell phone",
      placeholder: "(xxx) xxx-xxxx",
    },

    streetAddress: { required: "Street address *" },
    apt: { label: "Apartment / Unit" },

    city: { required: "City *" },
    state: { required: "State *" },
    zip: { required: "ZIP code *" },

    email: { label: "Email" },
    alternatePhone: { label: "Alternate phone" },

    genderIdentity: {
      optional: "Gender identity (optional)",
      placeholder: "Male, female, non-binary, etc.",
    },
    race: {
      optional: "Race (optional)",
      placeholder: "e.g. Black, White, Asian, etc.",
    },
    ethnicity: {
      optional: "Ethnicity (optional)",
      placeholder: "e.g. Hispanic/Latino, Not Hispanic",
    },

    hasDisability: {
      question: "Does the victim have a disability?",
    },

    disabilityType: {
      physical: "Physical",
      mental: "Mental",
      developmental: "Developmental",
      other: "Other",
    },
  },

  /* =========================
     NXTGUIDE CHAT
  ========================== */
  nxtGuide: {
    title: "NxtGuide",
    subtitle: "Trauma-informed virtual advocate",
    close: "Close",
    typing: "NxtGuide is typing…",
    empty: {
      title: "You can ask me things like:",
      q1: "“What is this site for?”",
      q2: "“Where do I start my application?”",
      q3: "“What documents will I need?”",
    },
    placeholders: {
      thinking: "Thinking…",
      ask: "Ask NxtGuide anything...",
    },
    cta: {
      needHelp: "Need help?",
      chatWith: "Chat with NxtGuide",
    },
    floating: {
  needHelpOnThisStep: "Need help on this step?",
},
    errors: {
      respondFailed:
        "Sorry, I had trouble responding just now. Please try again in a moment.",
      technicalProblem:
        "I ran into a technical problem while trying to respond. Please try again shortly.",
    },
  },

  /* =========================
     UI (BUTTONS, MODALS, GENERIC COPY)
  ========================== */
  ui: {
    buttons: {
      back: "Back",
      next: "Next",
      continue: "Continue",
      cancel: "Cancel",
      close: "Close",
      save: "Save",
      saving: "Saving…",
      submit: "Submit",
      submitting: "Submitting…",
      edit: "Edit",
      done: "Done",
      confirm: "Confirm",
      download: "Download",
      upload: "Upload",
      remove: "Remove",
      retry: "Retry",
      refresh: "Refresh",
    },

    status: {
      optional: "Optional",
      required: "Required",
      yes: "Yes",
      no: "No",
      none: "None",
      unknown: "Unknown",
      notProvided: "Not provided",
    },

    errors: {
      generic: "Something went wrong. Please try again.",
      network: "Network error. Please check your connection and try again.",
      unauthorized: "You don’t have access to this.",
      notFound: "That item could not be found.",
    },

    toasts: {
      saved: "Saved",
      updated: "Updated",
      copied: "Copied",
      uploaded: "Uploaded",
      removed: "Removed",
    },

    modals: {
      confirmTitle: "Confirm",
      areYouSure: "Are you sure?",
    },
  },

  /* =========================
     FORMS (REUSABLE + PAGE/FORM COPY)
     NOTE:
       - Put per-form title/description here (forms.victim.*)
       - Keep reusable labels/placeholders/validation in forms.labels/forms.placeholders/forms.validation
  ========================== */
  forms: {
    victim: {
      title: "Victim information",
      description:
        "This section is about the person who was physically injured or killed. If you are that person and over 18, this is your information.",
      civilRightsNote:
        "The following questions are used for civil rights reporting and do not affect eligibility. You can skip any that you do not wish to answer.",
      disabilityTypesLabel: "Disability type(s)",
    },

    labels: {
      firstName: "First name",
      lastName: "Last name",
      middleName: "Middle name",
      dateOfBirth: "Date of birth",
      email: "Email",
      phone: "Phone",
      address: "Street address",
      unit: "Apartment / Unit",
      city: "City",
      state: "State",
      zip: "ZIP code",
      county: "County",
      country: "Country",
      relationship: "Relationship",
      notes: "Notes",
    },

    documents: {
      title: "Documents",
      description:
        "Check off what you already have. This helps prevent delays and denials.",
      descriptionDraft:
        "Track what documents you have (uploads can be wired in next).",

      loadFailed: "Failed to load documents section.",
      noDraft: "No case draft loaded.",

      saveContinue: "Save & Continue",

      coreTitle: "Core documents",
      otherTitle: "Other documents",

      checklist: {
        policeReport: "Police report / incident report",
        medicalBills: "Medical bills / statements",
        counselingBills: "Counseling / therapy bills",
        funeralInvoices: "Funeral / burial invoices",
        wageProof: "Proof of lost wages (employer letter, pay stubs, etc.)",
        idProof: "ID proof (victim/applicant)",
      },

      otherEmpty: "No other documents added yet.",
      otherItemTitle: "Other document #{n}",
      otherLabel: "Label (optional)",
      otherPlaceholder: "e.g. court order, receipts",
      otherHaveIt: "Have it?",
      otherNotYet: "Not yet",

      addOther: "+ Add other document",

      notesLabel: "Notes (optional)",
      notesHint: "Anything you’re missing or want an advocate to know.",

      // Documents step (in the intake flow)
      stepTitle: "Upload police reports, bills, and other documents",
      viewOnlyBanner:
        "View-only access: you can review this section, but only the case owner can upload or modify documents.",
      intro:
        "Supporting documents help the Attorney General's office understand your case and verify the costs you're asking to be covered. You can upload:",
      bullets: {
        police: "Police reports or incident numbers",
        medical: "Hospital and medical bills",
        funeral: "Funeral and cemetery invoices",
        wages: "Pay stubs or letters from employers",
        other: "Any other proof of expenses related to the crime",
      },
      disclaimer:
        "Uploading documents does not submit your application. You'll have a chance to review everything on the Summary page before sending anything to the state.",
      goToUploadPage: "Go to document upload page",

      // Inline uploader strings
      uploader: {
        title: "Attach documents related to {context}",
        helper:
          "These uploads are optional, but they can help the Attorney General's office review this part of your application more quickly.",
        shortDescriptionLabel: "Short description (optional)",
        shortDescriptionPlaceholder:
          "e.g. Police report from CPD, case #...",
        uploadLabel: "Upload file(s)",
      },
    },

    placeholders: {
      selectOne: "Select one…",
      typeHere: "Type here…",
      search: "Search…",
    },

    validation: {
      required: "This field is required.",
      invalidEmail: "Please enter a valid email address.",
      invalidPhone: "Please enter a valid phone number.",
      invalidZip: "Please enter a valid ZIP code.",
      minChars: "Please enter at least {min} characters.",
      maxChars: "Please enter {max} characters or fewer.",
    },

applicant: {
  title: "Applicant information",
  description: "This is the person applying for compensation.",
  isVictimAlsoApplicantLabel: "Is the victim also the applicant?",
  sameAsVictimNote:
    "We’ll use the victim’s information as the applicant details for now.",

  // NEW — add this
  options: {
    victim: "I am the victim (my information is the same as above)",
    proxy: "I am applying on behalf of the victim (parent, spouse, other)",
  },

  // NEW — add this
  relationshipPlaceholder: "Parent, spouse, sibling, friend...",

  // NEW — add this
  legalGuardianship: {
    question:
      "If the victim is a minor or an incapacitated adult, do you have legal guardianship for them?",
    noNotSure: "No / Not sure",
  },

  // NEW: Seeking own expenses
  seekingOwnExpenses: {
    question: "Are you seeking compensation for your own expenses?",
  },
  descriptionOfExpensesSought: {
    label: "If no, what expenses are you requesting compensation for?",
    placeholder: "Describe the expenses you are requesting compensation for...",
  },
},

  employment: {
  title: "Work & income",
  description:
    "If the victim missed work or lost income because of the crime, add what you know here.",
  descriptionDraft: "Employer details and missed work (if applicable).",

  loadFailed: "Failed to load employment section.",
  noDraft: "No case draft loaded.",

  saveContinue: "Save & Continue",

  unknownHint: "If unsure, choose Unknown.",

  employedAtTimeLabel: "Was the victim employed at the time?",
  employerNameLabel: "Employer name (optional)",
  employerNamePlaceholder: "Company / employer name",
  employerPhoneLabel: "Employer phone (optional)",
  employerPhonePlaceholder: "(xxx) xxx-xxxx",
  employerAddressLabel: "Employer address (optional)",
  employerAddressPlaceholder: "Street, city, state",

  missedWorkLabel: "Did the victim miss work because of the crime?",
  missedWorkFromLabel: "Missed work from (optional)",
  missedWorkToLabel: "Missed work to (optional)",

  disabilityFromCrimeLabel: "Did the crime cause a disability that affects work?",
  },
employmentExtended: {
  title: "Work & income (loss of earnings)",
  description:
    "If you missed work because of the crime, the program may consider paying for some of that lost income.",

  fields: {
    employerNameLabel: "Employer name",
    employerAddressLabel: "Employer address",
    employerPhoneLabel: "Employer phone",
    netMonthlyWagesLabel: "Your net monthly wages (take-home pay)",
    netMonthlyWagesPlaceholder: "For example: 2200",
  },

  benefits: {
    question:
      "After the crime, did you receive sick time, vacation, disability, or other paid benefits?",
    notesLabel:
      "If you remember, briefly describe (for example: 2 weeks sick pay, 3 days vacation)...",
    // NEW: Benefit breakdown fields
    sickPayLabel: "Sick $",
    vacationPayLabel: "Vacation $",
    personalTimeLabel: "Personal $",
    disabilityPayLabel: "Disability $",
    otherBenefitLabel: "Other $",
  },

  noNotSure: "No / Not sure",

  footerNote:
    "In a later version, you'll be able to add more jobs and more detail here.",

  uploaderContextLabel: "work and income (pay stubs, employer letters)",
},

contact: {
  title: "Contact information",
  description:
    "Help us reach you and work with your advocate if you have one.",

  prefersEnglishQuestion: "Is English your preferred language?",
  preferredLanguageLabel: "If no, language you are most comfortable speaking:",
  preferredLanguagePlaceholder: "e.g. Spanish, Polish, etc.",

  workingWithAdvocateQuestion: "Are you working with an advocate?",
  advocateNameLabel: "Advocate name",
  advocatePhoneLabel: "Advocate telephone",
  advocateOrganizationLabel: "Advocate organization",
  advocateEmailLabel: "Advocate email address",

  consentToTalkToAdvocateQuestion:
    "Do you consent to allow the Attorney General's Office to discuss your claim with your advocate or obtain documents required for your claim?",

  alternateContactQuestion:
    "Is there another person you would prefer us to contact to discuss your claim?",
  alternateContactNameLabel: "Alternate contact name",
  alternateContactPhoneLabel: "Alternate contact telephone",
  alternateContactRelationshipLabel: "Relationship to you",
},

court: {
  title: "Court & restitution information",
  description:
    "If there is a criminal case, you can share what you know. It's okay if you don't know all of these details — answer what you can.",

  noNotSure: "No / Not sure",

  offenderArrestedQuestion: "Was the offender arrested?",
  offenderChargedQuestion: "Has the offender been charged in court?",
  applicantTestifiedQuestion:
    "Have you been required to testify in the criminal case?",

  criminalCaseNumberLabel: "Criminal case number (if known)",
  criminalCaseOutcomeLabel: "What was the outcome of the criminal case? (if known)",
  criminalCaseOutcomePlaceholder:
    "For example: convicted, case dismissed, plea deal, still pending...",

  restitutionOrderedQuestion:
    "Has the court ordered the offender to pay restitution (money directly to you or on your behalf)?",

  restitutionAmountLabel: "If yes, how much (approximate)?",
  restitutionAmountPlaceholder: "For example: 5000",

  humanTraffickingQuestion:
    "Has the offender been involved in a human trafficking court proceeding related to this incident?",

  humanTraffickingTestifiedQuestion:
    "Were you required to testify for the Human Trafficking court case?",

  humanTraffickingCaseNumberLabel: "Human trafficking case number (if known)",
  humanTraffickingCaseOutcomeLabel: "Outcome of the human trafficking case (if known)",
},

funeral: {
  title: "Funeral & dependents",
  description:
    "If the victim passed away or there are dependents affected by the crime, add what you know here.",
  descriptionDraft:
    "Funeral/burial details and dependent information (if applicable).",

  loadFailed: "Failed to load funeral section.",
  noDraft: "No case draft loaded.",

  saveContinue: "Save & Continue",

  unknownHint: "If unsure, choose Unknown.",

  victimDeceasedLabel: "Was the victim deceased as a result of the crime?",

  funeralHomeTitle: "Funeral home",
  funeralHomeNameLabel: "Funeral home name (optional)",
  funeralHomeNamePlaceholder: "Name",
  funeralHomePhoneLabel: "Funeral home phone (optional)",
  funeralHomePhonePlaceholder: "(xxx) xxx-xxxx",

  dependentsTitle: "Dependents",
  hasDependentsLabel: "Are there dependents who relied on the victim for support?",
  hasDependentsHint: "For example: children, spouse, or other dependents.",
  dependentsCountLabel: "How many dependents? (optional)",
  dependentsCountPlaceholder: "e.g. 2",
  dependentsNotesLabel: "Notes about dependents (optional)",
  dependentsNotesPlaceholder: "Anything helpful to know…",
},

funeralExtended: {
  title: "Funeral, burial, and dependents",
  description:
    "If the victim died as a result of the crime, this program may help with funeral, burial, or cremation costs. You can enter basic information here.",

  funeralHome: {
    nameLabel: "Funeral home name",
    phoneLabel: "Funeral home phone",
    billTotalLabel: "Total funeral bill (approximate)",
  },

  cemetery: {
    title: "Cemetery information",
    nameLabel: "Name of cemetery",
    phoneLabel: "Cemetery phone",
    billTotalLabel: "Total cemetery bill (approximate)",
  },

  payer: {
    title: "Who has paid or will pay these costs?",
    nameLabel: "Name of person paying",
    relationshipLabel: "Relationship to victim",
    relationshipPlaceholder: "Parent, spouse, sibling, friend...",
    amountPaidLabel: "Amount paid so far (approximate)",
  },

  esvf: {
    question:
      "Did you receive money from the City of Chicago ESVF for funeral expenses?",
    amountLabel: "How much did ESVF pay? (approximate)",
  },

  lifeInsurance: {
    question:
      "Did the victim have a life insurance policy that paid out after their death?",
    companyLabel: "Life insurance company",
    beneficiaryNameLabel: "Name of beneficiary",
    beneficiaryPhoneLabel: "Beneficiary phone",
    amountPaidLabel: "Amount paid (approximate)",
  },

  dependents: {
    title: "Dependents who relied on the victim's income",
    nameLabel: "Dependent name",
    relationshipLabel: "Relationship to victim",
    relationshipPlaceholder: "Child, spouse, partner, etc.",
    dobLabel: "Dependent date of birth",
    guardianLabel: "Guardian name & phone (if minor)",
  },

  placeholders: {
    moneyExample8000: "For example: 8000",
    moneyExample2000: "For example: 2000",
    moneyExample1500: "For example: 1500",
    moneyExample10000: "For example: 10000",
  },

  noNotSure: "No / Not sure",

  footerNote:
    "In a later version, you'll be able to add each dependent here and link them to loss-of-support claims.",

  uploaderContextLabel: "funeral, burial, and dependents",

  // NEW: Death benefits section
  deathBenefits: {
    title: "Death benefits",
    description:
      "If the victim died, please provide information about any death benefits received.",
    deathBenefitChicagoFundLabel: "Death Benefit From City of Chicago Fund $",
    lifeHealthAccidentInsuranceLabel:
      "Life, health accident, vehicle towing, or liability insurance $",
    unemploymentPaymentsLabel: "Unemployment Payments $",
    veteransSocialSecurityBurialLabel:
      "Veterans or Social Security Burial Benefits $",
    workersCompDramShopLabel: "Worker's Compensation or Dram Shop $",
    federalMedicarePublicAidLabel:
      "Federal Medicare or State Public Aid Program $",
  },
},

losses: {
  title: "Losses & money",
  description:
    "Select what you want help paying for. This helps us generate your packet and check missing docs.",

  options: {
    medical: "Medical bills",
    counseling: "Counseling / therapy",
    lostWages: "Lost wages / income",
    funeral: "Funeral / burial costs",
    propertyLoss: "Property loss",
    relocation: "Relocation / housing",
    other: "Other",
  },

  otherLabel: "Other (describe)",
},

lossesExtended: {
  title: "What do you need help paying for?",
  description:
    "This section lists the types of expenses and losses that may be covered by Crime Victims Compensation. Choose everything that applies.",

  groups: {
    medical: { title: "Medical, counseling, basic needs" },
    work: { title: "Work, income, and support" },
    funeralProperty: { title: "Funeral, burial, and property" },
    personalOther: { title: "Personal items & other" },
  },

  items: {
    medicalHospital: "Medical / hospital bills",
    dental: "Dental care",
    counseling: "Counseling / therapy",
    transportation: "Transportation to medical or court",
    accessibilityCosts: "Accessibility costs (wheelchair ramps, etc.)",
    temporaryLodging: "Temporary lodging / hotel",
    relocationCosts: "Relocation costs (moving for safety)",

    lossOfEarnings: "Loss of earnings (missed work)",
    lossOfSupport: "Loss of support to dependents",
    lossOfFutureEarnings: "Loss of future earnings",
    replacementServiceLoss: "Replacement service loss (services victim used to provide)",
    tuition: "Tuition / school-related costs",

    funeralBurial: "Funeral / burial / cremation",
    headstone: "Headstone",
    crimeSceneCleanup: "Crime scene cleanup",
    towingStorage: "Towing and storage of vehicle",
    securityRepairs: "Doors, locks, windows (security repairs)",

    evidenceClothingBedding: "Clothing or bedding taken as evidence",
    assistiveItems: "Prosthetic appliances, eyeglasses, hearing aids",
    replacementCosts: "Replacement costs for necessary items",
    legalFees: "Legal fees",
    tattooRemoval: "Tattoo removal (human trafficking cases)",
  },

  footerNote:
    "Choosing an item here does not guarantee payment, but it tells the program what you are asking to be considered.",
},

medical: {
  title: "Medical & counseling",
  description:
    "Add any treatment and counseling details you know. If you don’t know something, leave it blank.",
  descriptionDraft:
    "Treatment details and counseling information (if applicable).",

  loadFailed: "Failed to load medical section.",
  noDraft: "No case draft loaded.",

  saveContinue: "Save & Continue",

  hints: {
    unknownOk: "If unsure, choose Unknown.",
    dateFormat: "YYYY-MM-DD",
  },

  sections: {
    medical: "Medical treatment",
    counseling: "Counseling",
  },

  questions: {
    hasMedicalTreatment: "Did the victim receive medical treatment?",
    hasCounseling: "Did the victim receive counseling / therapy?",
  },

  fields: {
    hospitalName: "Hospital / facility name (optional)",
    hospitalCity: "Hospital / facility city (optional)",
    treatmentStart: "Treatment start date (optional)",
    treatmentEnd: "Treatment end date (optional)",
    providerName: "Counselor / provider name (optional)",
    sessionsCount: "Number of sessions (optional)",
  },

  placeholders: {
    hospitalName: "Hospital, clinic, urgent care, etc.",
    hospitalCity: "City",
    providerName: "Therapist, clinic, program, etc.",
    sessionsCount: "e.g. 8",
  },

  },
medicalExtended: {
  title: "Medical, dental, and counseling bills",
  description:
    "If you are asking for help with medical, dental, hospital, or counseling bills, you can list at least one provider here.",

  fields: {
    providerNameLabel: "Main hospital / clinic / therapist name",
    cityLabel: "City",
    phoneLabel: "Provider phone",
    serviceDatesLabel: "Dates of service (if known)",
    amountLabel: "Approximate total amount of this bill",
    amountPlaceholder: "For example: 2500",
  },

  otherSources: {
    question:
      "Do you have health insurance, public aid, or other programs that may pay some of these bills?",
    descriptionLabel:
      "Briefly list any insurance or programs (Medical Card, Medicare, private insurance, etc.)",
  },

  noNotSure: "No / Not sure",

  footerNote:
    "In a later version, we'll let you add more providers here, or your advocate can attach a full list.",

  uploaderContextLabel: "medical and counseling bills",
},

crime: {
  title: "Crime & incident",
  description: "Basic incident details help eligibility and documentation checks.",

  // ===== Existing keys (keep for backwards compatibility) =====
  incidentDateLabel: "Incident date",
  incidentTimeLabel: "Incident time (optional)",
  incidentTimePlaceholder: "e.g. 9:30 PM",

  locationAddressLabel: "Where did it happen? (street or nearest cross streets)",

  policeReportedLabel: "Was it reported to police?",
  policeDepartmentLabel: "Which police department?",
  policeReportNumberLabel: "Report / case number (if known)",

  offenderKnownLabel: "Is the offender known to you?",
  offenderNameLabel: "Offender name (if known)",

  narrativeLabel: "In a few words, what happened? (optional)",
  narrativePlaceholder: "Keep it brief. You can add more later.",

  // ===== NEW: keys required by your current CrimeForm component =====
  sectionTitle: "Crime and incident details",
  sectionDescription:
    "This section is about what happened. You do not need to remember every detail.",

  dateOfCrimeLabel: "Date of crime *",
  dateReportedLabel: "Date crime was reported",

  crimeAddressLabel: "Where did the crime happen? (street address or location) *",

  crimeCityLabel: "City *",
  crimeCountyLabel: "County",

  reportingAgencyLabel: "Police department crime was reported to *",
  reportingAgencyPlaceholder: "e.g. Chicago Police Department",

  policeReportNumberHelp: "Police report number (if you have it)",

  crimeDescriptionLabel: "Briefly describe what happened",
  crimeDescriptionPlaceholder: "In your own words, describe the incident.",

  injuryDescriptionLabel: "Briefly describe the injuries",
  injuryDescriptionPlaceholder:
    "For example: gunshot wound to leg, surgery, PTSD, etc.",

  offenderKnownQuestion: "Do you know who did this?",
  noNotSure: "No / Not sure",

  offenderNamesLabel: "Offender name(s), if known",

  offenderRelationshipLabel: "Relationship to victim, if any",
  offenderRelationshipPlaceholder: "Stranger, partner, family member, etc.",

  sexualAssaultKitQuestion:
    "Was a sexual assault evidence collection kit performed at a hospital?",

  uploaderContextLabel:
    "the crime and incident (police reports, witness statements)",
},

summary: {
  title: "Summary",
  description:
    "Review what you’ve entered. You can go back to any section to edit.",
  descriptionDraft: "Review your case before generating documents.",

  loadFailed: "Failed to load summary.",
  noDraft: "No case draft loaded.",

  save: "Save summary",

  // ===== UI-only =====
  quickTitle: "Quick summary",
  quickDescription: "This is a quick snapshot of what you’ve entered so far.",

  viewOnlyBanner:
    "View-only access: you can review this case, but you can’t edit fields, certification, or invites.",

  placeholders: {
    none: "—",
    notProvided: "Not provided",
    relationshipNotSet: "relationship not set",
    alreadyFinalReview: "You’re already on the final review step.",
  },

  actions: {
    downloadSummaryPdf: "Download summary PDF",
    downloadOfficialIlPdf: "Download official Illinois CVC form",
    // Alias for UI key used in SummaryView
    downloadOfficialIl: "Download official Illinois CVC form",
    saveCaseForAdvocateReview: "Save as case for advocate review",
    // Alias for UI key used in SummaryView
    saveCaseForAdvocate: "Save as case for advocate review",
    inviteAdvocate: "Invite advocate",
    close: "Close",
    sendInvite: "Send invite",
    inviting: "Inviting…",
  },

  invite: {
    title: "Invite an advocate",
    note: "The advocate must already have an account using this email.",
    advocateEmailLabel: "Advocate email",
    advocateEmailPlaceholder: "advocate@example.com",
    allowEdit: "Allow this advocate to edit",
  
    // Back-compat (keep)
    results: {
      saveCaseFirst:
        "Save this as a case first so we can generate a secure invite link.",
      mustBeLoggedIn: "You must be logged in to invite an advocate.",
      unexpected: "Unexpected error inviting advocate.",
      accessGranted:
        "✅ Access granted.\nShare this link with the advocate:\n{url}",
    },

    // Common shape used in UI components
    errors: {
      saveCaseFirst:
        "Save this as a case first so we can generate a secure invite link.",
      mustBeLoggedIn: "You must be logged in to invite an advocate.",
      unexpected: "Unexpected error inviting advocate.",
    },
    success: {
      accessGranted:
        "✅ Access granted.\nShare this link with the advocate:\n{url}",
    },
  },

  snapshots: {
    victimTitle: "Victim",
    applicantTitle: "Applicant",
    applicantSamePerson: "Victim and applicant are the same person.",

    crimeTitle: "Crime snapshot",
    crime: {
      dateOfCrime: "Date of crime",
      location: "Location",
      cityCounty: "City / County",
      reportedTo: "Reported to",
      policeReportNumber: "Police report #",
    },

    lossesTitle: "Losses",
    lossesNone: "No losses selected yet.",

    medicalTitle: "Medical snapshot",
    medical: {
      provider: "Provider",
      cityPhone: "City / Phone",
      serviceDates: "Dates of service",
approxBillAmount: "Approx. bill amount",
      noneEntered: "No medical provider entered yet.",
    },

    workTitle: "Work snapshot",
    work: {
      employer: "Employer",
      employerPhone: "Employer phone",
      netMonthlyWages: "Net monthly wages",
      noneEntered: "No work info entered yet.",
    },

    funeralTitle: "Funeral snapshot",
    funeral: {
      funeralHome: "Funeral home",
      funeralHomePhone: "Funeral home phone",
      totalFuneralBill: "Total funeral bill",
      payer: "Payer",
      amountPaidSoFar: "Amount paid so far",
      noPayer: "No payer entered yet.",
      noneEntered: "No funeral info entered yet.",
    },
  },

  // Aliases (some components expect these top-level blocks)
  crime: {
    title: "Crime snapshot",
    // Aliases for flat keys used in SummaryView (forms.summary.crime.*)
    dateOfCrime: "Date of crime",
    location: "Location",
    cityCounty: "City / County",
    reportedTo: "Reported to",
    policeReportNumber: "Police report #",
    fields: {
      dateOfCrime: "Date of crime",
      location: "Location",
      cityCounty: "City / County",
      reportedTo: "Reported to",
      policeReportNumber: "Police report #",
    },
  },

  medicalSnapshot: {
    title: "Medical snapshot",
    fields: {
      provider: "Provider",
      cityPhone: "City / Phone",
      serviceDates: "Dates of service",
      approxBillAmount: "Approx. bill amount",
    },
    noneEntered: "No medical provider entered yet.",
  },

  employmentSnapshot: {
    title: "Work snapshot",
    fields: {
      employer: "Employer",
      employerPhone: "Employer phone",
      netMonthlyWages: "Net monthly wages",
    },
    noneEntered: "No work info entered yet.",
  },

  funeralSnapshot: {
    title: "Funeral snapshot",
    fields: {
      funeralHome: "Funeral home",
      funeralHomePhone: "Funeral home phone",
      totalFuneralBill: "Total funeral bill",
      payer: "Payer",
      amountPaidSoFar: "Amount paid so far",
    },
    noPayer: "No payer entered yet.",
    noneEntered: "No funeral info entered yet.",
  },

  certificationUi: {
    title: "Certification & authorization",
    checks: {
      subrogation: "I acknowledge subrogation (repayment rules may apply).",
      release:
        "I acknowledge authorization/release for verification as required.",
      perjury:
        "I confirm the information is true to the best of my knowledge.",
    },
    signatureLabel: "Applicant signature (type your full name)",
    dateLabel: "Date",

    attorney: {
      question: "Are you being represented by an attorney?",
      yes: "Yes",
      no: "No",

      name: "Attorney name",
      ardc: "ARDC number (if known)",
      address: "Attorney address",
      city: "City",
      state: "State",
      zip: "ZIP",
      phone: "Phone",
      email: "Email",
    },
  },

  // Alias (many UIs expect `summary.certification.*`)
  certification: {
    title: "Certification & authorization",
    checks: {
      subrogation: "I acknowledge subrogation (repayment rules may apply).",
      release:
        "I acknowledge authorization/release for verification as required.",
      perjury:
        "I confirm the information is true to the best of my knowledge.",
    },
    signatureLabel: "Applicant signature (type your full name)",
    dateLabel: "Date",
    attorney: {
      question: "Are you being represented by an attorney?",
      name: "Attorney name",
      ardc: "ARDC number (if known)",
      address: "Attorney address",
      city: "City",
      state: "State",
      zip: "ZIP",
      phone: "Phone",
      email: "Email",
    },
  },

  sections: {
    victim: "Victim",
    applicant: "Applicant",
    crime: "Crime / incident",
    losses: "Losses requested",
    medical: "Medical & counseling",
    employment: "Employment",
    funeral: "Funeral",
    documents: "Documents (uploads)",
    certification: "Certification",
  },

  labels: {
    name: "Name",
    dob: "DOB",
    phone: "Phone",
    email: "Email",
    address: "Address",
    isVictimAlsoApplicant: "Is victim also applicant",
    relationshipToVictim: "Relationship to victim",
    date: "Date",
    time: "Time",
    location: "Location",
    reportedToPolice: "Reported to police",
    policeDepartment: "Police department",
    reportNumber: "Report number",
    to: "to",
  },

  losses: {
    // Used for the summary list; alias for "no losses selected yet"
    noneSelected: "No losses selected yet.",
    medical: "Medical",
    counseling: "Counseling",
    funeral: "Funeral",
    lostWages: "Lost wages",
    relocation: "Relocation",
    propertyLoss: "Property loss",
    other: "Other",
    otherYes: "Yes ({desc})",
    estimatedTotal: "Estimated total",
    // NEW: Specific loss type keys used by SummaryView
    medicalHospital: "Medical/Hospital",
    dental: "Dental",
    transportation: "Transportation",
    accessibilityCosts: "Accessibility Costs",
    crimeSceneCleanup: "Crime Scene Cleanup",
    relocationCosts: "Relocation Costs",
    temporaryLodging: "Temporary Lodging",
    tattooRemoval: "Tattoo Removal",
    lossOfEarnings: "Loss of Earnings",
    tuition: "Tuition",
    replacementServiceLoss: "Replacement Service Loss",
    locks: "Locks",
    windows: "Windows",
    clothing: "Clothing",
    bedding: "Bedding",
    prostheticAppliances: "Prosthetic Appliances",
    eyeglassesContacts: "Eyeglasses/Contacts",
    hearingAids: "Hearing Aids",
    replacementCosts: "Replacement Costs",
    lossOfSupport: "Loss of Support",
    towingStorage: "Towing and Storage",
    funeralBurial: "Funeral/Burial",
    lossOfFutureEarnings: "Loss of Future Earnings",
    legalFees: "Legal Fees",
    doors: "Doors",
    headstone: "Headstone",
  },

  medical: {
    medicalTreatment: "Medical treatment",
    hospital: "Hospital",
    city: "City",
    treatmentDates: "Treatment dates",
    counseling: "Counseling",
    provider: "Counseling provider",
    sessions: "Sessions",
    // NEW: Keys used by SummaryView
    cityPhone: "City / Phone",
    serviceDates: "Dates of service",
    // Alias for UI key used in SummaryView
    amount: "Approx. bill amount",
    // Alias for when no primary provider is entered
    noneEntered: "No medical provider entered yet.",
  },

  employment: {
    employedAtTime: "Employed at time",
    employer: "Employer",
    missedWork: "Missed work",
    missedDates: "Dates missed",
    disabilityFromCrime: "Disability from crime",
    // NEW: Keys used by SummaryView
    employerPhone: "Employer phone",
    netMonthlyWages: "Net monthly wages",
    // Alias for when no employment info is entered
    noneEntered: "No work info entered yet.",
  },

  funeral: {
    victimDeceased: "Victim deceased",
    funeralHome: "Funeral home",
    funeralPhone: "Funeral home phone",
    funeralHomePhone: "Funeral home phone", // NEW: Alias for SummaryView
    dependentsPresent: "Dependents present",
    dependentCount: "Dependent count",
    dependentNotes: "Dependent notes",
    // NEW: Keys used by SummaryView
    payer: "Payer",
    noPayer: "No payer entered yet.",
    // Aliases used by SummaryView
    totalBill: "Total funeral bill",
    amountPaid: "Amount paid so far",
    relationshipNotSet: "relationship not set",
    // Alias for when no funeral info is entered
    noneEntered: "No funeral info entered yet.",
  },

  applicant: {
    // Alias for text used when victim and applicant are the same person
    samePerson: "Victim and applicant are the same person.",
  },

  documents: {
    policeReports: "Police reports",
    medicalBills: "Medical bills",
    counselingBills: "Counseling bills",
    funeralBills: "Funeral bills",
    wageProof: "Wage proof",
    other: "Other",
    notes: "Notes",
  },

  certificationText: {
    disclaimer:
      "This is not legal advice. This is a plain-language confirmation that the information is accurate to the best of your knowledge.",
    fullNameLabel: "Full name (required)",
    fullNamePlaceholder: "Type your full name",
    dateLabel: "Date (required)",
    truthfulLabel:
      "I confirm the information provided is true and complete to the best of my knowledge.",
    releaseLabel:
      "I understand supporting documents may be required and I may be asked for verification.",
 },
},
}, // <-- ADD THIS COMMA (summary's parent object continues safely)
}; // closes en