// lib/i18n/en.ts
import type { I18nDict } from "./types";

export const en: I18nDict = {
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
  },

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
  loggingIn: "Logging in...",
  createAccount: "Create account",
  createAdvocateAccount: "Create Victim Advocate account",
  forgotPassword: "Forgot password",
},
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
        body: "You review a clean draft packet before anything is sent to the state.",
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
      respondFailed: "Sorry, I had trouble responding just now. Please try again in a moment.",
      technicalProblem: "I ran into a technical problem while trying to respond. Please try again shortly.",
    },
  },
};