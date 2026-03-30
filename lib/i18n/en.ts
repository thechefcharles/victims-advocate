// lib/i18n/en.ts
import type { I18nDict } from "./types";

export const en: I18nDict = {
  /* =========================
     NAV / COMMON
  ========================== */
  nav: {
    dashboard: "Dashboard",
    dashboardVictim: "My cases",
    dashboardAdvocate: "My clients",
    login: "Log In",
    logout: "Log Out",
    myAccount: "My account",
    accountPlaceholderTitle: "Account",
    accountPlaceholderBody:
      "More account settings and preferences will be available here soon.",
    accountVictimEmailCardBody:
      "This is the email you use to sign in. You can update your profile details in the form above.",
    accountAdvocateEmailCardBody:
      "This is the email you use to sign in. Update your work contact details in the form above.",
    language: "Language",
    brandTagline: "Victim Support · Made Simple",
    compensationHub: "Compensation",
    home: "Home",
    help: "Help",
    updates: "Updates",
    accountNav: "Account",
    mySupport: "My Dashboard",
    messages: "Messages",
    application: "Application",
    myDashboardAdvocate: "My Dashboard",
    myDashboardOrganization: "My Dashboard",
    commandCenter: "My Dashboard",
    clients: "Clients",
    organization: "Organization",
    orgSettings: "Org settings",
    organizationHome: "Organization home",
    organizationSetupNav: "Set up organization",
    adminHome: "Admin Home",
  },

  common: {
    loading: "Loading…",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    backToHome: "← Back To Home",
    backToWorkspace: "← Back to your workspace",
    backToWorkspaceInline: "Back to your workspace",
    yes: "Yes",
    no: "No",
  },

  notificationsPage: {
    title: "Notifications",
    subtitle:
      "Mark a notification as read to clear it from your bell count. Read items show a green check.",
    empty: "You have no notifications right now.",
    markRead: "Mark as read",
    readBadgeLabel: "Read",
    previewHiddenTitle: "You have a new update",
    connectionRequestIncomingTitle: "Connection request",
    connectionRequestPendingTitle: "Connection request pending",
    orgJoinRequestIncomingTitle: "Advocate membership request",
    orgJoinApprove: "Approve",
    orgJoinDecline: "Decline",
  },

  signup: {
    preferredNameLabel: "Preferred name",
    preferredNamePlaceholder: "e.g. Alex or Alex Martinez",
    preferredNameHelp:
      "We use your name to personalize your dashboard and messages. You can add more detail in account settings later.",
  },

  victimDashboard: {
    eyebrow: "My Dashboard",
    title: "My Dashboard",
    welcomeTitle: "Welcome, {name}",
    subtitle: "",
    signedInAs: "Signed in as",
    signedInAsUnknown: "—",
    whatToDoNext: "Next Step",
    creating: "Creating…",
    yourApplicationHeading: "Your Application",
    yourApplicationDescription: "This is your current application for support.",
    yourApplicationPrivacyLine:
      "Your status and eligibility are available inside your application.",
    statusField: "Status",
    eligibilityField: "Eligibility",
    updatingDetails: "Updating details…",
    priorityHigh: "Needs attention",
    priorityMedium: "Next up",
    priorityLow: "On track",
    caseActivityTitle: "This case",
    caseActivityIntro: "Everything here is for the case you selected above.",
    caseActivityMessages: "Messages",
    caseActivityDocuments: "Documents",
    caseActivityAppointments: "Appointments",
    caseActivitySupport: "Support options",
    messagesLoading: "Loading messages…",
    messagesUnreadOne: "1 unread message",
    messagesUnreadMany: "{count} unread messages",
    messagesInThread: "Message thread open",
    messagesEmpty: "No messages yet",
    documentsStatusMissing: "Some required documents are still needed",
    documentsStatusGeneric: "Add documents when you’re ready",
    documentsNoCase: "Open your application to manage documents",
    appointmentsEmpty: "No upcoming appointments",
    supportMatchOne: "1 suggested match",
    supportMatchMany: "{count} suggested matches",
    supportNoMatches: "No matches yet",
    supportNoCase: "Open your application to see support options",
    yourCasesTitle: "Your Cases",
    yourCasesHelp: "Choose a case from the menu—everything below updates for that case.",
    stateIL: "Illinois",
    stateIN: "Indiana",
    startApplication: "Add Another Case",
    noCasesTitle: "No case yet",
    noCasesBody:
      "Tap the big green button above to start. We save your work as you go.",
    loadError: "Couldn’t load your cases. Please try again.",
    sessionExpired: "Session expired. Please log in again.",
    continue: "Continue",
    more: "More",
    delete: "Delete",
    rename: "Rename",
    save: "Save",
    cancel: "Cancel",
    caseNamePlaceholder: "Case name",
    lastUpdatedDaysAgo: "Last updated {days} days ago",
    lastUpdatedToday: "Last updated today",
    lastUpdatedYesterday: "Last updated yesterday",
    lastUpdatedUnknown: "Last updated date unavailable",
    deleteModalTitle: "Delete this application?",
    deleteModalBodyLine1: "This will remove your information from this application.",
    deleteModalBodyLine2: "You won’t be able to undo this.",
    deleteModalCancel: "Cancel",
    deleteModalConfirm: "Delete",
    deleteFailed: "Could not delete this application. Try again.",
    editNameTitle: "Edit Name",
    progressTitle: "Your progress",
    selectedCaseLabel: "You’re working on",
    activeCaseBadge: "Selected",
    funnel: {
      ariaLabel: "Your three steps",
      stepEligibility: "Check Eligibility",
      stepApplication: "Apply",
      stepSupport: "Track",
      stepHint:
        "Tap a step to open it. Eligibility is part of starting your application; if you skipped it, the first step shows in red but you can still apply and track.",
    },
    myCasesDropdown: "My Cases",
    myCasesSectionLabel: "My cases",
    resumeApplication: "Resume Application",
    applyResumeCardAria: "Start or resume your application",
    supportTeamTitle: "My Support Team",
    supportTeamOrg: "Organization",
    supportTeamAdvocates: "Advocate",
    supportTeamNoOrg: "No organization linked to this case yet.",
    supportTeamNoAdvocates: "No advocate connected yet.",
    supportTeamLoading: "Loading…",
    supportTeamConnectCta: "Connect With An Advocate",
    supportTeamAdvocateRequestPending: "Connection request pending — we’ll notify you when your advocate responds.",
    supportTeamAddOrgCta: "Find An Organization",
    supportTeamEditOrgTitle: "Manage organization for this case",
    supportTeamEditAdvocateTitle: "Manage advocates for this case",
    supportTeamSendMessage: "Send Message",
    supportTeamContactOrg: "Contact Organization",
    caseAdvocateManage: {
      title: "Advocates For This Case",
      back: "Back To Dashboard",
      intro:
        "These advocates can access this application. You can remove someone or connect a different advocate. Secure messages are available from your application.",
      sendMessage: "Send Message",
      remove: "Remove From Case",
      removeConfirmTitle: "Remove This Advocate?",
      removeConfirmBody:
        "They will no longer be able to open this case. You can send a new connection request later if needed.",
      connectDifferent: "Connect Or Add Advocate",
      removed: "Advocate removed from this case.",
      removeFailed: "Could not remove advocate. Try again.",
    },
    caseOrgManage: {
      title: "Organization For This Case",
      back: "Back To Dashboard",
      intro:
        "The organization shown here is linked to this application only. Changing it updates who receives certain messages and program matching for this case.",
      contactOrganization: "Contact Organization",
      changeOrganization: "Change Organization",
      removeOrganization: "Remove Organization Link",
      removeConfirmTitle: "Remove Organization Link?",
      removeConfirmBody:
        "Your case will use the default platform organization until you choose a victim-service organization again. Messaging may use a different thread.",
      legacyLabel: "Default (no victim-service organization selected)",
      organizationRemoved:
        "Organization link removed. This case now uses the default platform organization until you choose another.",
      updated: "Organization updated.",
      updateFailed: "Could not update organization. Try again.",
      noOrgBody: "No victim-service organization is selected for this case yet.",
      referralUpdatesTitle: "Referral updates",
      referralUpdatesIntro:
        "Each line is one organization you contacted. If they accept, your case is connected to them.",
      referralsLoadError: "We couldn’t load referral status. You can try again later.",
      referralStatusPending: "Waiting for their response",
      referralStatusAccepted: "Accepted — your case is now connected to this organization",
      referralStatusDeclined: "They declined — your case stayed with your current organization",
      referralUpdatesEmpty:
        "No referrals yet. When you send one from Find organizations, updates will show here.",
    },
    applyPathConnect: "Connect With An Advocate",
    applyPathSelf: "Apply By Myself",
    applyPathBack: "Back",
    applyPathAria: "Apply",
    stateModalTitle: "Which State Program?",
    stateModalSubtitle: "Illinois and Indiana use different forms and eligibility questions—we’ll match the right one.",
    eligibleReviewIntro:
      "We’ll start your application for {state} and take you to the eligibility check.",
    continueToEligibility: "Continue To Eligibility",
    applyNow: "Apply Now",
    profileBannerTitle: "Finish your profile",
    profileBannerBodyNoName:
      "Add how you’d like to be called in Account settings—we’ll use it across your dashboard.",
    profileBannerBody:
      "Add your phone number and city so advocates and organizations can reach you when you’re working on a case.",
    profileBannerCta: "Open account settings",
    startNewApplication: "Start A New Application",
    newCaseButton: "New Case",
    caseEdit: "Edit",
    getHelp: {
      title: "Get Help",
      connectAdvocate: "Connect With An Advocate",
      findOrganizations: "Find Organizations Near You",
      hintAdvocate: "Secure messaging and requests in a few steps.",
      hintOrganizations: "Map and distance sorting when you share location.",
    },
    findOrganizationsPage: {
      title: "Organizations Near You",
      subtitle:
        "Explore victim-service organizations in your area. Your exact location stays on this device—we sort distances here, not on our servers.",
      back: "← Back To My Dashboard",
      mapIntro:
        "Use the map to see organizations near you. Tap the button below only when you are ready to share your location with this browser session.",
      shareLocation: "Share my location",
      sharing: "Getting location…",
      tryAgain: "Try again",
      locationDenied:
        "Location access was blocked. You can enable it in your browser settings and try again.",
      locationUnavailable:
        "We couldn’t read your location. You can try again, or check Wi‑Fi/location settings on your device.",
      locationTimeout:
        "Location timed out. Try again—moving near a window or turning on Wi‑Fi often helps.",
      positionUnavailable:
        "Your device couldn’t determine a position right now. Try again in a moment or enable location for this site in settings.",
      locationNotSupported:
        "This browser doesn’t support location, or it’s turned off. Try another browser or device.",
      locationNeedsHttps:
        "Location only works on a secure page (HTTPS). Open this site with https:// or contact support.",
      yourLocation: "Your approximate location",
      approximateNote: "Approximate pin",
      milesAway: "mi away",
      accepting: "Accepting new clients",
      notAccepting: "Not accepting new clients",
      capacity: "Capacity",
      noOrgs:
        "There aren’t any publicly active organizations in the directory yet. New partners are added over time—please check back later.",
      loadError: "We couldn’t load organizations. Please try again.",
      privacyNote:
        "Distances are calculated in your browser. We do not send your GPS coordinates to our servers.",
      sendReferral: "Send referral for review",
      sendReferralSending: "Sending…",
      sendReferralDone: "Referral sent. The organization’s team can review your case.",
      sendReferralFailed: "Could not send referral. Try again or pick another organization.",
      sendReferralDuplicate:
        "You already have a referral in progress to this organization. Check Organization for this case for status.",
    },
    caseActivityForCase: "For this case",
    caseDetailsHeading: "Case Details",
    nextStepTitle: "Next Step",
    eligibilityPickStateFirst:
      "Choose Illinois or Indiana so we can open the right program for this case.",
    applyForCompensation: "Apply For Victim Compensation",
    applyModal: {
      title: "Before You Start",
      body:
        "We recommend a quick check to see if you qualify. You can still open the form without it—if you skip, your claim may not go through if you aren’t eligible.",
      checkFirst: "Check Eligibility First",
      skipToForm: "Skip And Open Form",
      skipNote: "Skipping may mean your application is denied if you don’t qualify.",
    },
    nextAction: {
      labels: {
        noCases: "Apply For Victim Compensation",
        noFocusCase: "Choose A Case",
        continueEligibility: "Am I Eligible?",
        continueApplication: "Resume Application",
        viewMessages: "Read Your Messages",
        uploadDocuments: "Add Missing Documents",
        completeRequiredInfo: "Finish Required Information",
        continueSectionsIncomplete: "Continue Your Application",
        reviewSkippedFields: "Review Skipped Questions",
        connectAdvocate: "Connect With An Advocate",
        viewSupportOptions: "See Support Options",
        upToDate: "Open Your Application",
      },
      reasons: {
        noCases: "You can begin here. The process takes a few minutes.",
        noFocusCase: "Select the case you wish to work on, or start a new application.",
        continueEligibility: "Answer a few questions to see if you may qualify.",
        continueApplication:
          "Your progress is saved. You may continue your application when you are ready.",
        submitApplication: "Required information looks complete—submit when you’re ready.",
        messagesUnreadOne: "Someone on your team sent you a message.",
        messagesUnreadMany: "You have {count} unread messages.",
        uploadDocuments: "We’re missing documents we need to move forward.",
        completeRequiredInfo: "A few required items still need your attention.",
        continueSectionsIncomplete: "Some parts of the form aren’t finished yet.",
        reviewSkippedFields: "You skipped some items—review when you can.",
        connectAdvocate: "You can ask to connect with an advocate.",
        viewSupportOptions: "There may be local programs that can help.",
        upToDate: "You have no urgent tasks. You may open your application at any time.",
      },
    },
    contextualNextStep: {
      checkEligibility: "Check Eligibility",
      finishApplication: "Finish Application",
      submitApplication: "Submit",
    },
  },

  victimMessages: {
    backDashboard: "Back to My Dashboard",
    eyebrow: "Secure messaging",
    title: "Messages",
    subtitle:
      "Chat with your advocate team in one place per case. This is separate from your application form.",
    loadError: "Couldn’t load your cases. Try again.",
    noCases: "You don’t have a case yet. Start an application to use secure messages.",
    startApplication: "Start application",
    casePickerLabel: "Cases",
    yourCases: "Your cases",
    threadHeading: "Conversation",
    threadSubtitle: "Only people with access to this case can see this thread.",
    threadEmpty: "No messages yet. Say hello or ask a question.",
  },

  advocateDashboard: {
    welcomeTitle: "Welcome, {name}",
    titleFallback: "My Dashboard",
    organizationMeta: "Organization: {name}",
    noOrganizationMeta:
      "You’re not linked to an agency workspace yet. Find your organization on the map and send a join request—your agency will be notified to approve.",
    connectOrganizationLink: "Connect your Organization",
    profileBannerTitle: "Complete your advocate profile",
    profileBannerBody:
      "Add your work contact details so victims and your team know how to reach you.",
    profileBannerBodyNoName:
      "Add how we should address you and your work contact details—helps victims and your team reach you.",
    profileBannerCta: "Update in My account",
  },

  advocateFindOrganizations: {
    title: "Find your organization",
    subtitle:
      "Filter by state, browse the map, and request to join your agency. Organization admins are notified to approve your membership.",
    back: "← Back to My Dashboard",
    mapIntro:
      "Use the map to see organizations near you. Tap the button below only when you are ready to share your location with this browser session.",
    stateFilterLabel: "State",
    shareLocation: "Share my location",
    sharing: "Getting location…",
    tryAgain: "Try again",
    locationDenied:
      "Location access was blocked. You can enable it in your browser settings and try again.",
    locationUnavailable:
      "We couldn’t read your location. You can try again, or check Wi‑Fi/location settings on your device.",
    locationTimeout:
      "Location timed out. Try again—moving near a window or turning on Wi‑Fi often helps.",
    positionUnavailable:
      "Your device couldn’t determine a position right now. Try again in a moment or enable location for this site in settings.",
    locationNotSupported:
      "This browser doesn’t support location, or it’s turned off. Try another browser or device.",
    locationNeedsHttps:
      "Location only works on a secure page (HTTPS). Open this site with https:// or contact support.",
    yourLocation: "Your approximate location",
    approximateNote: "Approximate pin",
    milesAway: "mi away",
    accepting: "Accepting new clients",
    notAccepting: "Not accepting new clients",
    capacity: "Capacity",
    noOrgs:
      "There aren’t any publicly active organizations in the directory yet. New partners are added over time—please check back later.",
    noOrgsInState:
      "No organizations match this state filter right now. Organizations must be publicly active and matching-ready. Try “All states” or pick another state.",
    loadError: "We couldn’t load organizations. Please try again.",
    privacyNote:
      "Distances are calculated in your browser. We do not send your GPS coordinates to our servers.",
    requestJoin: "Request to join",
    requestSent: "Request sent. Your organization will be notified in Updates.",
    requestBusy: "Sending…",
    requestError: "Could not send request. Try again.",
    orgPickerLabel: "Organization",
    orgSearchPlaceholder: "Search by name or region…",
    orgSearchNoMatches: "No matches. Try different words or adjust the state filter.",
    orgSelectedTitle: "Selected organization",
  },

  compensationHub: {
    contextLine: "My Dashboard → Compensation",
    eyebrow: "Crime Victims Compensation",
    title: "Compensation help",
    subtitle: "Illinois or Indiana Crime Victims Compensation—in plain language, at your pace.",
    primaryCta: "Start My Application",
    primaryHint: "This will guide you step by step.",
    secondaryGetHelp: "Get Help Now",
    secondaryConnectAdvocate: "Connect With An Advocate",
    learnLink: "Learn how compensation works",
    howItWorksTitle: "How it works",
    step1Label: "Step 1",
    step1Title: "Check Eligibility",
    step1Body: "Short questions so we know what may apply before details.",
    step2Label: "Step 2",
    step2Title: "Complete Your Application",
    step2Body: "Guided intake, documents, and a draft you can review.",
    step3Label: "Step 3",
    step3Title: "Stay Connected",
    step3Body: "Messages, advocates, and next steps as your case moves forward.",
    mayNeedTitle: "What you may need (if you have it)",
    mayNeedLi1: "Victim name, date of birth, and address",
    mayNeedLi2: "Crime date and location; police report number if available",
    mayNeedLi3: "Medical or funeral bills; employer info for lost wages",
    mayNeedFootnote: "Missing something? You can still start—we’ll help you plan what to gather.",
    disclaimerShort:
      "NxtStps is not a government site; flows mirror official Illinois and Indiana CVC applications.",
    modalTitle: "Select your state",
    modalBody: "Which state’s Crime Victims Compensation program are you applying to?",
    modalCancel: "Cancel",
    guestConnectHint:
      "To connect with an advocate you’ll need a free account—we’ll guide you when you tap Connect with an advocate.",
    nonVictimRoleHint:
      "Advocate connections are for victim accounts—Get help now opens Help for other roles.",
    openAdvocateDashboard: "Open Case Dashboard",
  },

  /* =========================
     ELIGIBILITY CHECK
  ========================== */
  eligibility: {
    introQualify: "Let’s see if you may qualify.",
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
      headline: "You may qualify.",
      body: "Based on your answers, you meet the basic requirements to submit an Illinois Crime Victims Compensation application.",
      cta: "Continue Application",
      secondary: "You can save your progress and return at any time.",
    },
    resultNeedsAttention: {
      headline: "You may still be eligible.",
      body: "You can apply, but missing information or contact issues may delay or prevent payment.",
      checklist: [
        "Confirm who will sign the application",
        "Gather police report information (if available)",
        "Make sure your address and phone number are reliable",
        "Be prepared to return requested documents within 45 days",
      ],
      ctaReady: "Continue Application",
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
      runCheck: "Run Eligibility Check",
      startIntake: "Start Intake",
      skipWarningTitle: "Run eligibility check first?",
      skipWarningBody:
        "The eligibility check helps confirm you can apply and what to expect. We recommend running it before starting the intake form.",
      continueAnyway: "Continue To Intake Anyway",
      runCheckFirst: "Run Eligibility Check First",
    },
  },

  eligibilityIN: {
    introQualify: "Let’s see if you may qualify.",
    purposeText:
      "This short check helps confirm whether you can apply for Indiana Violent Crime Victim Compensation and whether you're ready to start. It does not submit an application and does not affect your eligibility.",
    questionOf: "Question {current} of {total}",
    q1: {
      title: "Who is applying?",
      question: "Which option best describes you?",
      options: {
        victim: "I am the victim of the crime",
        surviving_spouse: "I am the surviving spouse of the victim",
        dependent_child: "I am a dependent child of the victim",
        none: "None of these / I'm not sure",
      },
      helper: "Indiana law limits who can submit an application to victims, surviving spouses, or dependent children.",
    },
    q2: {
      title: "Location of crime",
      question: "Did the crime occur in Indiana?",
      helper: "The Indiana Violent Crime Victim Compensation Fund only covers crimes that occurred in Indiana.",
      yes: "Yes",
      no: "No",
      notSure: "I'm not sure",
    },
    q3: {
      title: "Police report & cooperation",
      question: "Was the crime reported to law enforcement within 72 hours, and are you willing to cooperate with law enforcement during the investigation and prosecution?",
      helper: "Indiana requires the crime to be reported within 72 hours. Contact ICJI at 1-800-353-1484 if you have questions about this requirement.",
      yes: "Yes",
      no: "No",
      notSure: "I'm not sure",
    },
    q4: {
      title: "Out-of-pocket expenses",
      question: "Did the victim incur at least $100 in out-of-pocket expenses as a result of the crime?",
      helper: "Medical bills, funeral costs, counseling, and other eligible expenses count toward the $100 minimum.",
      yes: "Yes",
      no: "No",
      notSure: "I'm not sure",
    },
    q5: {
      title: "Victim conduct",
      question: "Did the victim contribute to the crime or to their injury?",
      helper: "If the victim contributed to the crime or their injury, they may not be eligible.",
      yes: "No, the victim did not contribute",
      no: "Yes, the victim contributed",
      notSure: "I'm not sure",
    },
    q6: {
      title: "Filing deadline",
      question: "Can the application be filed within 180 days of the date of the crime?",
      helper: "Indiana requires applications within 180 days. Exceptions exist for exigent circumstances and victims of child sex crimes. Contact ICJI for details.",
      yes: "Yes",
      no: "No",
      notSure: "I'm not sure",
    },
    q7: {
      title: "If claimant is under 18",
      question: "If you (the claimant) are under 18, will a parent or legal guardian sign and date the application?",
      helper: "Indiana requires a parent or legal guardian to sign for claimants under 18. If this does not apply, select N/A.",
      yes: "Yes",
      no: "No",
      notSure: "I'm not sure",
      na: "N/A (I am 18 or older)",
    },
    resultEligible: {
      headline: "You may qualify.",
      body: "Based on your answers, you meet the basic requirements to submit an Indiana Violent Crime Victim Compensation application.",
      cta: "Continue Application",
      secondary: "You can save your progress and return at any time.",
    },
    resultNeedsAttention: {
      headline: "You may still be eligible.",
      body: "You can apply, but missing information may delay or prevent payment.",
      checklist: [
        "Confirm reporting within 72 hours and willingness to cooperate with law enforcement",
        "Verify at least $100 in out-of-pocket expenses",
        "Ensure application will be filed within 180 days of the crime",
        "If under 18, arrange for parent or legal guardian to sign",
      ],
      ctaReady: "Continue Application",
      ctaHelp: "Get Help From an Advocate",
    },
    resultNotEligible: {
      headline: "You may not be eligible under Indiana Violent Crime Victim Compensation rules.",
      body: "Eligibility requires that you are a victim, surviving spouse, or dependent child; the crime occurred in Indiana; and other requirements are met. Contact ICJI at 1-800-353-1484 for questions.",
      nextSteps: [
        "Contact the Indiana Criminal Justice Institute at 1-800-353-1484 for eligibility questions",
        "If the crime occurred in another state, check that state's victim compensation program",
      ],
      cta: "Find Other Support Options",
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
    resumeApplication: "Resume Application",
    startApplication: "Start Application",
    myCases: "My cases",

    inlineLoginTitle: "Let's get you signed in",
    emailLabel: "Email",
    passwordLabel: "Password",
    rememberMe: "Remember me",
    signingIn: "Signing in…",
    signIn: "Sign In",

    newHere: "New here?",
    createVictimAccount: "Create victim account",
    workAsAdvocate: "Work as an advocate?",
    createAdvocateAccount: "Create victim advocate account",
    needHelp: "Need help?",
  },

  loginForm: {
    title: "Log In",
    submit: "Log In",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    loggingIn: "Logging in…",
    createAccount: "Create account",
    createAdvocateAccount: "Create Victim Advocate account",
    forgotPassword: "Forgot password",
    tooManyAttempts: "Too many failed attempts. Try again later.",
  },

  forgotPassword: {
    title: "Reset password",
    subtitle: "Enter your email and we'll send you a link to reset your password.",
    emailPlaceholder: "Email",
    submit: "Send Reset Link",
    sending: "Sending…",
    sentHint: "Check your email for a reset link. It may take a few minutes.",
    backToLogin: "← Back To Login",
  },

  resetPassword: {
    title: "Set new password",
    subtitle: "Enter your new password below.",
    newPasswordPlaceholder: "New password",
    confirmPasswordPlaceholder: "Confirm password",
    passwordsMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    submit: "Update Password",
    updating: "Updating…",
    backToLogin: "← Back To Login",
    invalidOrExpired: "Invalid or expired link",
    invalidOrExpiredHint: "Password reset links expire after 1 hour. Request a new one below.",
    requestNewLink: "Request new reset link",
    successTitle: "Password updated",
    successHint: "Redirecting you to login…",
  },

  /* =========================
     HOME PAGE
  ========================== */
  home: {
    hero: {
      title: "Victim Compensation — one hub",
      subtitle:
        "Process Crime Victim Compensation, check status, and manage cases—one platform for victims, advocates, and organizations.",
      disclaimer:
        "NxtStps is a supportive tool. It does not replace legal advice, emergency services, or medical care. You can pause anytime.",
      ctaCreateAccount: "Create An Account",
      ctaMyDashboard: "My Dashboard",
      signInPrompt: "Already have an account?",
      videoTitle: "See how it works",
      demoVideoIntro: "Short overview—when you’re ready.",
    },

    newsletter: {
      title: "Newsletter (optional)",
      description:
        "Occasional updates on NxtStps and victim-resource news—never required to get help.",
      placeholder: "you@example.com",
      submit: "Subscribe",
      submitting: "…",
      subscribed: "Subscribed",
      thanks: "Thanks for subscribing.",
      error: "Something went wrong. Try again.",
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
        "NxtStps is designed for everyone who touches the victim-services journey—from victims themselves to advocates, hospitals, and state agencies.",
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
        "NxtStps eliminates confusion, missing documents, and preventable denials—giving victims and advocates a stable, transparent path to support.",
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
  stepOf: "Step {current} of {total}",
  reassurance: "You can save and come back anytime.",
  header: {
    badge: "Illinois Crime Victims Compensation",
    title: "Your Application",
    subtitle:
      "Your guided Crime Victims Compensation application—answer what you can and pause anytime.",
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
    continue: "Continue",
    saveAndExit: "Save And Exit",
    reviewSubmit: "Review And Submit",
  },

  viewOnly: "View-only access (you can’t edit this case).",
  viewOnlyBanner:
    "View-only access: you can review this case, but you can’t edit it.",

  footer: {
    draftDisclaimer:
      "Draft. Nothing is submitted to the state without your consent. You can save and come back anytime.",
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

  safeMode: {
    takeYourTime: "Take your time. You can come back to this later.",
    crimeDescription:
      "You can skip this for now or answer only what you feel comfortable sharing.",
    injuryDescription:
      "You can skip this for now or answer only what you feel comfortable sharing.",
    optionalDetail: "You can skip this for now or answer later.",
  },

  skipForNow: "Skip for now",
  answerLater: "Answer later",

  explainThis: "Explain this",
  explainThisNeedHelp: "Need help understanding what we're asking?",

  review: {
    missing: "Missing",
    skipped: "Skipped for now",
    deferred: "Answer later",
    editSection: "Edit section",
    completenessNote:
      "Some items are optional or can be skipped. Required items are listed below so you know what’s needed.",
  },

  validation: {
    applicantRequired:
      "Please finish the applicant and contact questions on this step before continuing (including language preference, and advocate details if you are working with someone).",
    victimRequired:
      "Please fill in the victim's name, date of birth, and address before continuing.",
    completeApplicantFirst:
      "Complete the Applicant step first. After that, you can move through the rest of the form.",
    completeVictimBeforeOther:
      "Complete the Victim step before opening Crime & incident or later sections.",
    crimeMinimumRequired:
      "Please provide at least the date of the crime, where it happened, and which police department it was reported to.",
    certificationRequired:
      "Before saving this as a case, please review the certification section and add your name, date, and acknowledgements.",
  },

  requiredBeforeContinue: {
    modalTitle: "Still required before you can continue",
    close: "Close",
    viewRequiredItems: "What’s still required?",
    reviewApplication: "Review application",
    reviewModeBanner:
      "Review mode: go through each step in order with Continue. Step tabs are locked until you finish.",
    ackLossesNone: "I confirm I have no loss categories to claim on this step",
    ackEmploymentNoEmployer:
      "I confirm I have no employer to add (or I’ll add one above before continuing)",
    ackFuneralContinue:
      "I’ll continue without funeral details for now (or I’ll add them above)",
    contactPreferredLanguage: "Preferred language (when not using English)",
    advocateName: "Advocate or organization name (you indicated you’re working with someone)",
    advocatePhone: "Advocate phone number",
    applicantFirstName: "Applicant first name",
    applicantLastName: "Applicant last name",
    applicantDateOfBirth: "Applicant date of birth",
    applicantRelationship: "Relationship to victim",
    applicantStreet: "Applicant street address",
    applicantCity: "Applicant city",
    applicantState: "Applicant state",
    applicantZip: "Applicant ZIP code",
    applicantLast4Ssn: "Applicant last 4 digits of SSN (Indiana)",
    applicantSeekingOwnExpenses: "Whether you’re seeking your own expenses (yes or no)",
    victimFirstName: "Victim first name",
    victimLastName: "Victim last name",
    victimDateOfBirth: "Victim date of birth",
    victimStreet: "Victim street address",
    victimCity: "Victim city",
    victimZip: "Victim ZIP code",
    victimState: "Victim state",
    victimLast4Ssn: "Victim last 4 digits of SSN (Indiana)",
    whoIsSubmitting: "Who is submitting the application (Indiana)",
    crimeDate: "Date of crime",
    crimeAddress: "Location / address where the crime occurred",
    crimeCity: "City where the crime occurred",
    reportingAgency: "Agency the crime was reported to",
    selectLossCategory:
      "Select at least one loss category, or confirm below that none apply",
    medicalProviderName: "Medical or counseling provider name (for the losses you selected)",
    employmentEmployerOrConfirm:
      "At least one employer name for lost earnings, or confirm below",
    funeralDetailsOrConfirm:
      "Funeral home or bill amount for funeral-related losses, or confirm below",
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
    int: {
      whoIsSubmitting: "Who is submitting the claim?",
      whoOptions: {
        victim: "Victim",
        claimant: "Claimant",
        advocate: "Advocate",
      },
      last4SSN: "Last 4 digits of Social Security or Tax ID",
      autoAccident: "Is this an automobile accident?",
      autoInsuranceName: "Name of auto insurance",
      physicalInjuries: "Does the victim have physical injuries?",
      medicalFacilityName: "Name of medical facility for treatment",
      timeOfCrime: "Time crime occurred",
      crimeType: "Crime type",
      causeNumber: "Cause number",
      willingToAssistProsecution: "Are you willing to assist law enforcement with prosecution?",
      notWillingExplain: "If not willing to prosecute (please explain why)",
      compensationRequesting: "What forms of compensation are you requesting?",
      medicalDentalCounseling: "Medical / dental / counseling",
      lossOfIncome: "Loss of income",
      funeralBurial: "Funeral / burial",
      lossOfSupport: "Loss of support",
      other: "Other",
      otherDescribe: "Other (describe)",
    },
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
    "On the next step you’ll enter the victim’s details; we’ll copy them into the applicant section when you continue to Crime & incident.",

  // NEW — add this
  options: {
    victim: "I am the victim (we’ll match applicant details after you enter victim info)",
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
    "Review what you’ve entered and your next step. You can edit any section when you’re ready.",
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

  checkpoint: {
    progressTitle: "Application progress",
    progressHint:
      "You’ve reached {visited} of {total} sections in this intake (including this review).",
    missingTitle: "Missing information",
    missingExplainer: "Missing items may delay progress.",
    missingEmpty: "No missing required fields at this checkpoint.",
    deferredTitle: "Deferred / skipped items",
    deferredExplainer: "Skipped or deferred items can be completed later.",
    deferredEmpty: "No items marked as skipped or deferred.",
    nextStepTitle: "Your next step",
    applicationDetailsTitle: "Application details",
    applicationDetailsToggle: "Show full application details",
    documentsTitle: "Documents",
    documentsSubtitle: "Documents can help support your case.",
    documentsEmpty: "No documents uploaded yet. You can add files from the documents step.",
    uploadDocuments: "Upload Documents",
    uploadMissingDocuments: "Upload Missing Documents",
    messagesTitle: "Messages",
    messagesSubtitle: "Secure conversation with your advocate",
    messagesEmpty: "You do not have any secure messages yet.",
    messagesOpenTool:
      "Secure messaging is on your Messages page—open it anytime to read or reply without leaving your application summary.",
    messagesOpenToolCta: "Open Messages",
    appointmentsTitle: "Appointments",
    appointmentsSubtitle: "Upcoming support appointments",
    appointmentsEmpty: "No appointments scheduled yet.",
    appointmentsCta: "View Appointments",
    recommendedTitle: "Recommended support organizations",
    whatNextTitle: "What happens next",
    whatNextIncomplete:
      "Continue your application when you’re ready. You can save and come back anytime.",
    whatNextMaybeDocsAndMessages:
      "Your next steps may include uploading documents or reviewing messages.",
    whatNextSupportOrgs:
      "You can review support organizations matched to your needs when you’re ready.",
    whatNextAllClear:
      "You’re up to date for now. Check back for updates or messages.",
    viewMessages: "View Messages",
  },

  actions: {
    downloadSummaryPdf: "Download summary PDF",
    downloadOfficialIlPdf: "Download official Illinois CVC form",
    // Alias for UI key used in SummaryView
    downloadOfficialIl: "Download official Illinois CVC form",
    downloadOfficialIn: "Download official Indiana CVC form",
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

  accountAdvocate: {
    title: "Advocate profile",
    intro:
      "This information helps victims and your organization identify you. Your organization is managed by your team—it shows here when your account is linked.",
    privacyNote: "We do not collect SSN or tax IDs here.",
    organizationSection: "Organization",
    organizationHelp:
      "Your employer or program is set by your organization admin. Contact them if this looks wrong.",
    organizationName: "Organization",
    organizationEmpty: "Not linked to an organization yet",
    identitySection: "Name & role",
    preferredName: "Preferred name (how you’d like to be addressed)",
    legalFirstName: "Legal first name",
    legalLastName: "Legal last name",
    jobTitle: "Title / role",
    workLocationSection: "Work location",
    workCity: "City",
    workState: "State",
    workZip: "ZIP",
    contactSection: "Work contact",
    workPhone: "Work phone",
    workPhoneExt: "Extension",
    alternatePhone: "Alternate phone",
    preferredContactMethod: "Preferred contact method",
    contactSelect: "Select…",
    contactEmail: "Email",
    contactPhone: "Phone call",
    contactSms: "SMS",
    safeToLeaveVoicemail: "Safe to leave voicemail at work number?",
    interpreterYes: "Yes",
    interpreterNo: "No",
    interpreterUnspecified: "Prefer not to say",
    languagesSection: "Languages",
    languages: "Languages you work in",
    languagesPlaceholder: "e.g. English, Spanish",
    save: "Save profile",
    saving: "Saving…",
    saved: "Saved.",
    saveError: "Couldn’t save. Try again.",
    notSignedIn: "You’re not signed in.",
  },

  accountPersonal: {
    title: "Personal information",
    intro:
      "This information is saved to your account. Your advocate and organizations working with you on a case can view it when they need it.",
    privacyNote: "We never collect Social Security numbers in this form.",
    identitySection: "Name and identity",
    demographicsSection: "Demographics",
    addressSection: "Address",
    contactSection: "Contact",
    otherSection: "Work, language, and accessibility",
    preferredName: "Preferred name",
    legalFirstName: "Legal first name",
    legalLastName: "Legal last name",
    pronouns: "Pronouns",
    genderIdentity: "Gender identity",
    dateOfBirth: "Date of birth",
    ethnicity: "Ethnicity",
    race: "Race",
    streetAddress: "Street address",
    apt: "Apt / unit",
    city: "City",
    state: "State",
    zip: "ZIP",
    cellPhone: "Cell phone",
    alternatePhone: "Alternate phone",
    preferredContactMethod: "Preferred contact method",
    contactEmail: "Email",
    contactPhone: "Phone call",
    contactSms: "Text (SMS)",
    contactAny: "No preference",
    safeToLeaveVoicemail: "OK to leave voicemail",
    occupation: "Occupation",
    educationLevel: "Education",
    primaryLanguage: "Primary language",
    interpreterNeeded: "Interpreter needed",
    interpreterYes: "Yes",
    interpreterNo: "No",
    interpreterUnspecified: "Prefer not to say",
    disabilityOrAccessNeeds: "Disability or access needs",
    eduLessThanHs: "Less than high school",
    eduHsGed: "High school / GED",
    eduSomeCollege: "Some college",
    eduAssociates: "Associate degree",
    eduBachelors: "Bachelor’s degree",
    eduGraduate: "Graduate degree",
    eduPreferNot: "Prefer not to say",
    eduSelect: "Select…",
    save: "Save",
    saving: "Saving…",
    saved: "Saved.",
    loadError: "Could not load your information.",
    saveError: "Could not save. Check your entries and try again.",
    notSignedIn: "Not signed in.",
  },
}; // closes en