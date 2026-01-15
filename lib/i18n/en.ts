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

    viewOnly: "View-only access (you can’t edit this case).",
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
      missingId:
        "Saved, but no case ID was returned. Check the API response.",
      unexpected:
        "Something went wrong saving your case. See console for details.",
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
  },
};