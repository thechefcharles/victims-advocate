/**
 * Domain 7.3 — AI escalation pattern-matching detector.
 *
 * Deterministic rule-based detection. NEVER uses an AI model to detect
 * escalation — Category 1 (safety/crisis) MUST fire without failure, and a
 * probabilistic model introduces failure modes we cannot accept.
 *
 * PRIVACY NOTE: `messageText` is scanned for pattern matches and then
 * discarded. It is NEVER returned, logged, or persisted by this module. All
 * downstream escalation records carry only a reason_code and surfaced
 * resources — never the raw text.
 */

export type EscalationCategory =
  | "safety_crisis"
  | "scope_boundary"
  | "accumulative_distress";

export interface EscalationDetection {
  triggered: boolean;
  category: EscalationCategory | null;
  /** Specific trigger identified (never the raw text). */
  reasonCode: string | null;
  resourcesSurfaced: string[];
  /** True for Category 1 and Category 3 full — session moves to 'escalated'. */
  requiresSessionEscalation: boolean;
  /** True for Category 3 first threshold only — session stays active. */
  requiresSoftEscalation: boolean;
  /** Category 2 inline boundary copy, returned without a model call. */
  inlineMessage: string | null;
  /** New distress count to persist (Category 3 bookkeeping). */
  nextDistressCount: number;
  /** True if this detection should flip soft_escalation_fired on the counter. */
  flipSoftFired: boolean;
}

// ---------------------------------------------------------------------------
// Category 1 — safety/crisis patterns
// ---------------------------------------------------------------------------

interface PatternEntry {
  pattern: RegExp;
  reasonCode: string;
}

const CATEGORY_1_PATTERNS: PatternEntry[] = [
  { pattern: /\bkill(ing)?\s+(my\s*)?self\b/i, reasonCode: "self_harm_explicit" },
  { pattern: /\bsuicid(e|al|ality)\b/i, reasonCode: "suicidal_ideation" },
  { pattern: /\bend\s+(my|it\s*all|everything)\b/i, reasonCode: "suicidal_ideation" },
  { pattern: /\bwant\s+to\s+(die|hurt\s+myself|harm\s+myself)\b/i, reasonCode: "self_harm_explicit" },
  { pattern: /\bdon'?t\s+want\s+to\s+(live|be\s+here|be\s+alive)\s*(anymore)?\b/i, reasonCode: "suicidal_ideation" },
  { pattern: /\bno\s+reason\s+to\s+(live|go\s+on|continue)\b/i, reasonCode: "suicidal_ideation" },
  { pattern: /\bhurt(ing)?\s+(my\s*)?self\b/i, reasonCode: "self_harm_explicit" },
  { pattern: /\bself[\s-]?harm(ing)?\b/i, reasonCode: "self_harm_explicit" },
  { pattern: /\b(he|she|they)(\s+is|\s*'?s)\s+(hitting|beating|hurting|choking|strangling)\s+me\b/i, reasonCode: "ongoing_violence" },
  { pattern: /\b(i\s*(am|'m)|im)\s+(not\s+safe|in\s+danger|being\s+(hit|beaten|abused))\b/i, reasonCode: "immediate_danger" },
  { pattern: /\bafraid\s+for\s+my\s+life\b/i, reasonCode: "immediate_danger" },
  { pattern: /\bhe('?s|\s+is)\s+(going\s+to|gonna)\s+(kill|hurt|find)\s+me\b/i, reasonCode: "immediate_danger" },
  { pattern: /\bcan'?t\s+do\s+this\s+anymore\b.*\b(end|over|done)\b/i, reasonCode: "suicidal_ideation" },
  { pattern: /\bthinking\s+about\s+(ending|killing)\b/i, reasonCode: "suicidal_ideation" },
];

// ---------------------------------------------------------------------------
// Category 2 — scope boundary patterns
// ---------------------------------------------------------------------------

const CATEGORY_2_PATTERNS: PatternEntry[] = [
  { pattern: /\bwill\s+i\s+(win|get\s+approved|get\s+the\s+money)\b/i, reasonCode: "outcome_guarantee_request" },
  { pattern: /\bam\s+i\s+(going\s+to|gonna)\s+(win|get\s+approved)\b/i, reasonCode: "outcome_guarantee_request" },
  { pattern: /\bhow\s+much\s+(will|am\s+i\s+going\s+to)\s+(i\s+)?(get|receive)\b/i, reasonCode: "outcome_guarantee_request" },
  { pattern: /\b(is\s+this|would\s+this\s+be)\s+legal\b/i, reasonCode: "legal_advice_request" },
  { pattern: /\bwhat\s+should\s+i\s+(do|say)\s+legally\b/i, reasonCode: "legal_advice_request" },
  { pattern: /\bwhat\s+are\s+my\s+(legal\s+)?rights\b/i, reasonCode: "legal_advice_request" },
  { pattern: /\bshould\s+i\s+(sue|press\s+charges|file\s+a\s+lawsuit)\b/i, reasonCode: "legal_advice_request" },
  { pattern: /\b(is|would)\s+it\s+(be\s+)?(legal|illegal)\b/i, reasonCode: "legal_advice_request" },
  { pattern: /\b(talk|speak|chat)\s+to\s+(a\s+)?(real\s+)?(person|human|advocate)\b/i, reasonCode: "human_request" },
  { pattern: /\bi\s+(need|want)\s+a\s+(human|real\s+person|advocate)\b/i, reasonCode: "human_request" },
  { pattern: /\bcan\s+(i|you)\s+(connect\s+me|give\s+me\s+a\s+number)\s+(to|for)\s+(someone|a\s+person)\b/i, reasonCode: "human_request" },
  { pattern: /\bwhat\s+(is|does)\s+my\s+lawyer\s+(say|think|mean)\b/i, reasonCode: "legal_advice_request" },
  { pattern: /\bshould\s+i\s+(accept|sign|agree)\s+to\s+(this|the)\s+(offer|settlement|deal)\b/i, reasonCode: "legal_advice_request" },
];

/**
 * Only IL and IN are currently supported. Any mention of another US state by
 * name triggers the unsupported-state boundary.
 */
const SUPPORTED_STATES = new Set(["illinois", "indiana", "il", "in"]);
const OTHER_STATES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "iowa", "kansas", "kentucky", "louisiana", "maine", "maryland",
  "massachusetts", "michigan", "minnesota", "mississippi", "missouri",
  "montana", "nebraska", "nevada", "new hampshire", "new jersey",
  "new mexico", "new york", "north carolina", "north dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
  "south dakota", "tennessee", "texas", "utah", "vermont", "virginia",
  "washington", "west virginia", "wisconsin", "wyoming",
];

function matchUnsupportedState(text: string): string | null {
  const lower = text.toLowerCase();
  for (const name of OTHER_STATES) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) return name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Category 3 — distress signal patterns (soft; not crisis)
// ---------------------------------------------------------------------------

const CATEGORY_3_PATTERNS: PatternEntry[] = [
  { pattern: /\b(this|it)\s+is\s+(pointless|hopeless|useless)\b/i, reasonCode: "hopelessness" },
  { pattern: /\bnothing\s+(will|can)\s+help\b/i, reasonCode: "hopelessness" },
  { pattern: /\bwhy\s+(bother|even\s+try)\b/i, reasonCode: "hopelessness" },
  { pattern: /\bwhat'?s\s+the\s+point\b/i, reasonCode: "hopelessness" },
  { pattern: /\bi\s+(can'?t|cannot)\s+do\s+this\s+(anymore|any\s+longer)\b/i, reasonCode: "exhaustion" },
  { pattern: /\bi'?m\s+done\s+(trying|with\s+this)\b/i, reasonCode: "exhaustion" },
  { pattern: /\b(i\s+)?give\s+up\b/i, reasonCode: "giving_up" },
  { pattern: /\b(this|you|you'?re|the\s+system)\s+(is\s+useless|is\s+a\s+joke|don'?t\s+work)\b/i, reasonCode: "system_anger" },
  { pattern: /\bjust\s+(stop|end\s+this|close\s+this)\b/i, reasonCode: "abrupt_exit" },
  { pattern: /\bnever\s+mind\b.*\b(forget\s+it|doesn'?t\s+matter)\b/i, reasonCode: "giving_up" },
];

// ---------------------------------------------------------------------------
// Category 3 bookkeeping thresholds
// ---------------------------------------------------------------------------

export const SOFT_ESCALATION_THRESHOLD = 3;
export const FULL_ESCALATION_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Resource packs (category-specific). Hotline + text-line numbers are the
// platform's standing crisis strip — admin-maintained at runtime in a later
// sprint; baseline values used here are the canonical US lines.
// ---------------------------------------------------------------------------

const CRISIS_RESOURCES = [
  "988 Suicide & Crisis Lifeline: Call or text 988",
  "Crisis Text Line: Text HOME to 741741",
  "National DV Hotline: 1-800-799-7233",
];

// ---------------------------------------------------------------------------
// Inline boundary copy (Category 2)
// ---------------------------------------------------------------------------

const BOUNDARY_MESSAGES: Record<string, string> = {
  outcome_guarantee_request:
    "I can't predict how a state program will decide your case. Your advocate can walk through likely scenarios with you.",
  legal_advice_request:
    "I'm not able to give legal advice. A licensed attorney or your advocate can answer that.",
  human_request:
    "You can ask to speak with your advocate any time. I can help you draft what you'd like to say, or surface their contact info on request.",
  unsupported_state:
    "I only cover Illinois and Indiana right now. For other states, please contact that state's victim compensation program directly.",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function matchFirst(text: string, patterns: PatternEntry[]): string | null {
  for (const entry of patterns) {
    if (entry.pattern.test(text)) return entry.reasonCode;
  }
  return null;
}

/**
 * Deterministic escalation detection. Scans text for category 1 (crisis) and
 * category 2 (scope boundary) patterns first; falls through to category 3
 * (accumulative distress) which uses the caller-provided counter.
 *
 * @param messageText     Applicant's most recent message. Used for pattern
 *                        matching only; NEVER returned or logged.
 * @param currentDistressCount Previously persisted counter for this session.
 * @param softEscalationAlreadyFired Whether Category 3 soft has already fired.
 */
export function detectEscalation(
  messageText: string,
  currentDistressCount: number,
  softEscalationAlreadyFired: boolean,
): EscalationDetection {
  // Category 1 — highest priority.
  const cat1 = matchFirst(messageText, CATEGORY_1_PATTERNS);
  if (cat1) {
    return {
      triggered: true,
      category: "safety_crisis",
      reasonCode: cat1,
      resourcesSurfaced: CRISIS_RESOURCES,
      requiresSessionEscalation: true,
      requiresSoftEscalation: false,
      inlineMessage: null,
      nextDistressCount: currentDistressCount,
      flipSoftFired: false,
    };
  }

  // Category 2 — scope boundary.
  const cat2 = matchFirst(messageText, CATEGORY_2_PATTERNS);
  if (cat2) {
    return {
      triggered: true,
      category: "scope_boundary",
      reasonCode: cat2,
      resourcesSurfaced: [],
      requiresSessionEscalation: false,
      requiresSoftEscalation: false,
      inlineMessage: BOUNDARY_MESSAGES[cat2] ?? BOUNDARY_MESSAGES.legal_advice_request,
      nextDistressCount: currentDistressCount,
      flipSoftFired: false,
    };
  }
  const unsupportedState = matchUnsupportedState(messageText);
  if (unsupportedState && !SUPPORTED_STATES.has(unsupportedState)) {
    return {
      triggered: true,
      category: "scope_boundary",
      reasonCode: "unsupported_state",
      resourcesSurfaced: [],
      requiresSessionEscalation: false,
      requiresSoftEscalation: false,
      inlineMessage: BOUNDARY_MESSAGES.unsupported_state,
      nextDistressCount: currentDistressCount,
      flipSoftFired: false,
    };
  }

  // Category 3 — accumulative. Increment counter only on a pattern hit.
  const cat3 = matchFirst(messageText, CATEGORY_3_PATTERNS);
  if (!cat3) {
    return {
      triggered: false,
      category: null,
      reasonCode: null,
      resourcesSurfaced: [],
      requiresSessionEscalation: false,
      requiresSoftEscalation: false,
      inlineMessage: null,
      nextDistressCount: currentDistressCount,
      flipSoftFired: false,
    };
  }

  const nextCount = currentDistressCount + 1;

  // Full escalation: already had a soft fire and signals continue past the
  // full threshold OR count reaches the full threshold directly.
  if (softEscalationAlreadyFired && nextCount >= FULL_ESCALATION_THRESHOLD) {
    return {
      triggered: true,
      category: "accumulative_distress",
      reasonCode: "accumulated_distress_full",
      resourcesSurfaced: CRISIS_RESOURCES,
      requiresSessionEscalation: true,
      requiresSoftEscalation: false,
      inlineMessage: null,
      nextDistressCount: nextCount,
      flipSoftFired: false,
    };
  }

  // Soft escalation: first time we hit the soft threshold.
  if (!softEscalationAlreadyFired && nextCount >= SOFT_ESCALATION_THRESHOLD) {
    return {
      triggered: true,
      category: "accumulative_distress",
      reasonCode: "accumulated_distress_soft",
      resourcesSurfaced: [],
      requiresSessionEscalation: false,
      requiresSoftEscalation: true,
      inlineMessage: null,
      nextDistressCount: nextCount,
      flipSoftFired: true,
    };
  }

  // Under threshold: count but don't escalate yet.
  return {
    triggered: false,
    category: "accumulative_distress",
    reasonCode: cat3,
    resourcesSurfaced: [],
    requiresSessionEscalation: false,
    requiresSoftEscalation: false,
    inlineMessage: null,
    nextDistressCount: nextCount,
    flipSoftFired: false,
  };
}
