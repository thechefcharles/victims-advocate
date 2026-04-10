/**
 * Deterministic "next best action" for cases and victim dashboard (Phase 10).
 * No AI, no randomness, no new network dependencies — callers pass existing signals.
 */

import type { ProductPriority } from "./priority";
import { applicantCaseMessagesUrl } from "@/lib/routes/pageRegistry";

export type NextActionKind =
  | "resume_application"
  | "view_messages"
  | "upload_documents"
  | "view_support"
  | "none";

/**
 * Stable id for translating primary next-step copy (victim dashboard, etc.).
 * Does not change routing or ordering — same branches as label/reason.
 */
export type NextActionUiVariant =
  | "no_cases"
  | "no_focus_case"
  | "continue_eligibility"
  | "continue_application"
  | "messages_unread"
  | "upload_documents"
  | "complete_required_info"
  | "continue_sections_incomplete"
  | "review_skipped_fields"
  | "connect_advocate"
  | "view_support_options"
  | "up_to_date";

export type NextAction = {
  label: string;
  action: NextActionKind;
  /** Use "" when the UI should run a client handler (e.g. create case) instead of navigation */
  href: string;
  priority: ProductPriority;
  reason: string;
  uiVariant: NextActionUiVariant;
  /** For i18n templates (e.g. unread message count) */
  reasonParams?: { unread?: number };
};

export type EligibilityResult = "eligible" | "needs_review" | "not_eligible" | null;

export type CompletenessSignal = {
  overall_status?: string;
  missing_items?: Array<{ type?: string; severity?: string }>;
  summary_counts?: { blocking_count?: number };
};

const INTAKE = "/compensation/intake";

export function hasBlockingDocumentGap(result: CompletenessSignal | null): boolean {
  if (!result?.missing_items?.length) return false;
  return result.missing_items.some(
    (i) => i.type === "missing_document" && i.severity === "blocking"
  );
}

export function hasBlockingCompletenessIssue(result: CompletenessSignal | null): boolean {
  if (!result?.missing_items?.length) return false;
  return result.missing_items.some((i) => i.severity === "blocking");
}

export function needsResumeApplication(
  eligibilityResult: EligibilityResult | undefined | null,
  status: string | undefined
): boolean {
  if (!eligibilityResult) return true;
  return (status ?? "draft") === "draft";
}

function victimIntakeHref(caseId: string): string {
  return `${INTAKE}?case=${encodeURIComponent(caseId)}`;
}

function adminCaseHref(caseId: string): string {
  return `/admin/cases/${encodeURIComponent(caseId)}`;
}

export type CaseNextActionInput = {
  mode: "victim" | "admin";
  caseId: string;
  eligibilityResult: EligibilityResult | undefined | null;
  status: string | undefined;
  messagesUnread: number;
  completenessResult: CompletenessSignal | null;
  matchCount: number;
  /** Sections still incomplete on intake summary (getReviewStatus.missing.length) */
  intakeMissingReviewCount?: number;
  /** Skipped + deferred fields count */
  intakeDeferredSkippedCount?: number;
  /** Victim has an advocate assigned */
  hasAdvocateConnected?: boolean;
};

/**
 * Single-case next step for intake summary, admin case workspace, etc.
 * Order matches victim dashboard: resume intake first, then messages, then blocking issues, then matches.
 */
export function getNextActionForCase(input: CaseNextActionInput): NextAction {
  const {
    mode,
    caseId,
    eligibilityResult,
    status,
    messagesUnread,
    completenessResult,
    matchCount,
    intakeMissingReviewCount = 0,
    intakeDeferredSkippedCount = 0,
    hasAdvocateConnected = true,
  } = input;

  const baseHref = mode === "admin" ? adminCaseHref(caseId) : victimIntakeHref(caseId);

  const resume = needsResumeApplication(eligibilityResult, status);
  const blockingDoc = hasBlockingDocumentGap(completenessResult);
  const blockingOther =
    hasBlockingCompletenessIssue(completenessResult) && !blockingDoc;

  if (resume) {
    if (!eligibilityResult) {
      return {
        label: "Continue eligibility",
        action: "resume_application",
        href: `/compensation/eligibility/${encodeURIComponent(caseId)}`,
        priority: "high",
        reason: "Finish eligibility so we can guide your next steps.",
        uiVariant: "continue_eligibility",
      };
    }
    /** Eligibility done; still draft — use intake review counts when provided (victim dashboard). */
    if (intakeMissingReviewCount > 0) {
      return {
        label: "Continue My Application",
        action: "resume_application",
        href: baseHref,
        priority: "medium",
        reason: "Some sections still need information before you’re ready to submit.",
        uiVariant: "continue_sections_incomplete",
      };
    }
    if (intakeDeferredSkippedCount > 0) {
      return {
        label: "Review skipped fields",
        action: "resume_application",
        href: baseHref,
        priority: "medium",
        reason: "You deferred or skipped some fields—review them when you can.",
        uiVariant: "review_skipped_fields",
      };
    }
    return {
      label: "Continue My Application",
      action: "resume_application",
      href: baseHref,
      priority: "medium",
      reason: "Your progress is saved. You may continue your application when you are ready.",
      uiVariant: "continue_application",
    };
  }

  if (messagesUnread > 0) {
    const messagesHref =
      mode === "victim" ? applicantCaseMessagesUrl(caseId) : baseHref;
    return {
      label: "View Messages",
      action: "view_messages",
      href: messagesHref,
      priority: "high",
      reason:
        messagesUnread === 1
          ? "You have an unread message from your advocate team."
          : `You have ${messagesUnread} unread messages from your advocate team.`,
      uiVariant: "messages_unread",
      reasonParams: { unread: messagesUnread },
    };
  }

  if (blockingDoc) {
    return {
      label: "Upload Documents",
      action: "upload_documents",
      href: baseHref,
      priority: "high",
      reason: "You still need to upload required documents to move forward.",
      uiVariant: "upload_documents",
    };
  }

  if (blockingOther) {
    return {
      label: "Complete required information",
      action: "resume_application",
      href: baseHref,
      priority: "high",
      reason: "There are blocking completeness issues to resolve on your application.",
      uiVariant: "complete_required_info",
    };
  }

  if (intakeMissingReviewCount > 0) {
    return {
      label: "Continue My Application",
      action: "resume_application",
      href: baseHref,
      priority: "medium",
      reason: "Some sections still need information before you’re ready to submit.",
      uiVariant: "continue_sections_incomplete",
    };
  }

  if (intakeDeferredSkippedCount > 0) {
    return {
      label: "Review skipped fields",
      action: "resume_application",
      href: baseHref,
      priority: "medium",
      reason: "You deferred or skipped some fields—review them when you can.",
      uiVariant: "review_skipped_fields",
    };
  }

  if (!hasAdvocateConnected) {
    return {
      label: "Connect with an advocate",
      action: "view_messages",
      href:
        mode === "admin"
          ? baseHref
          : `/compensation/connect-advocate?case=${encodeURIComponent(caseId)}`,
      priority: "medium",
      reason: "No advocate is connected to this case yet.",
      uiVariant: "connect_advocate",
    };
  }

  if (matchCount > 0) {
    return {
      label: "View Support Options",
      action: "view_support",
      href: baseHref,
      priority: "medium",
      reason: "There are organizations that may match what you’re looking for.",
      uiVariant: "view_support_options",
    };
  }

  return {
    label: "View Messages",
    action: "none",
    href: mode === "victim" ? applicantCaseMessagesUrl(caseId) : baseHref,
    priority: "low",
    reason: "You’re up to date. Review messages or your application any time.",
    uiVariant: "up_to_date",
  };
}

export type UserNextActionInput = {
  cases: Array<{ id: string; eligibility_result?: EligibilityResult | null; status?: string }>;
  focusCaseId: string | null;
  focusCase:
    | { id: string; eligibility_result?: EligibilityResult | null; status?: string }
    | undefined;
  messagesUnread: number;
  completenessResult: CompletenessSignal | null;
  matchCount: number;
  /** True when the focused case has at least one advocate on case_access (or unknown while loading). */
  hasAdvocateOnFocusCase?: boolean;
  /** While support-team data is loading, keep next-step logic from flashing “connect advocate”. */
  supportTeamLoading?: boolean;
  /** From intake review-status (missing required fields count). */
  intakeMissingReviewCount?: number;
  /** From intake review-status (skipped + deferred counts). */
  intakeDeferredSkippedCount?: number;
};

/**
 * Victim dashboard primary next step (same ordering rules as the former inline logic).
 */
export function getNextActionForUser(input: UserNextActionInput): NextAction {
  const {
    cases,
    focusCaseId,
    focusCase,
    messagesUnread,
    completenessResult,
    matchCount,
    hasAdvocateOnFocusCase = false,
    supportTeamLoading = false,
    intakeMissingReviewCount = 0,
    intakeDeferredSkippedCount = 0,
  } = input;

  if (cases.length === 0) {
    return {
      label: "Start My Application",
      action: "resume_application",
      href: "",
      priority: "high",
      reason: "You have not started an application yet—we’ll guide you step by step.",
      uiVariant: "no_cases",
    };
  }

  if (!focusCase) {
    return {
      label: "Start My Application",
      action: "resume_application",
      href: "#your-cases",
      priority: "medium",
      reason: "Select a case below or start a new application.",
      uiVariant: "no_focus_case",
    };
  }

  const hasAdvocateConnected =
    supportTeamLoading || hasAdvocateOnFocusCase;

  return getNextActionForCase({
    mode: "victim",
    caseId: focusCase.id,
    eligibilityResult: focusCase.eligibility_result,
    status: focusCase.status,
    messagesUnread,
    completenessResult,
    matchCount,
    intakeMissingReviewCount,
    intakeDeferredSkippedCount,
    hasAdvocateConnected,
  });
}

/** Advocate command-center row — uses fields already returned by the API */
export type AdvocateCaseRow = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  alert_count: number;
  completeness_blocking_count: number;
  completeness_status: string;
  ocr_warning: boolean;
};

const PRIORITY_ORDER: Record<AdvocateCaseRow["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Higher score = more urgent — deterministic tiebreakers.
 */
export function advocateCaseUrgencyScore(c: AdvocateCaseRow): number {
  let score = 0;
  if (c.alert_count > 0) score += 1000 + Math.min(c.alert_count, 99);
  score += (3 - PRIORITY_ORDER[c.priority]) * 100;
  if (c.completeness_blocking_count > 0) score += 80 + Math.min(c.completeness_blocking_count, 19);
  if (c.completeness_status === "incomplete" || c.completeness_status === "insufficient_information") {
    score += 40;
  }
  if (c.ocr_warning) score += 10;
  return score;
}

export function sortAdvocateCasesForQueue<T extends AdvocateCaseRow>(cases: T[]): T[] {
  return [...cases].sort((a, b) => {
    const ds = advocateCaseUrgencyScore(b) - advocateCaseUrgencyScore(a);
    if (ds !== 0) return ds;
    return a.id.localeCompare(b.id);
  });
}
