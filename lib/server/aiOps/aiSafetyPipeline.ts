/**
 * Domain 7.3 — AI Ops safety pipeline.
 *
 * Every AI response passes through these 5 layers before return:
 *   Layer 1 — Mode constraint   : forbidden patterns rejected.
 *   Layer 2 — Policy/context    : response may not reference data outside
 *                                 the mode's allowedContextScopes.
 *   Layer 3 — Content safety    : harmful / discriminatory / doxxing patterns.
 *   Layer 4 — Disclaimer inject : append mode-specific disclaimer.
 *   Layer 5 — Escalation check  : run escalationDetector on the MODEL OUTPUT
 *                                 to catch AI-generated crisis content.
 *
 * This module is deterministic; it does not call a model itself.
 */

import { getModeConfig, type AIModeKey } from "./aiModeRegistry";
import { getDisclaimer } from "./aiPromptRegistry";
import {
  detectEscalation,
  type EscalationDetection,
} from "@/lib/server/aiGuidance/escalationDetector";

export interface SafetyResult {
  safe: boolean;
  response: string;
  disclaimerAdded: boolean;
  escalationFired: boolean;
  layersFailed: string[];
  escalation?: EscalationDetection;
}

const SCOPE_VIOLATION_KEYWORDS: Record<string, string[]> = {
  // Keywords that suggest the response references data outside the scope.
  intake_session: ["case note", "advocate note", "internal note"],
  field_definition: ["case note", "applicant profile", "document upload"],
  field_examples: ["case note", "applicant profile"],
  applicant_summary_only: ["case note", "advocate note"],
  document_requirements: ["case note", "applicant profile"],
  aggregate_metrics: ["applicant name", "case_id:", "victim name"],
  audit_summary: ["applicant name", "victim name"],
};

const CONTENT_SAFETY_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /\bgo\s+ahead\s+and\s+(hurt|kill)\b/i, reason: "harm_encouragement" },
  { regex: /\b(you|they)\s+deserve\s+(to\s+die|to\s+be\s+hurt)\b/i, reason: "harm_encouragement" },
  { regex: /\bssn:\s*\d{3}-?\d{2}-?\d{4}\b/i, reason: "pii_ssn" },
  { regex: /\bdob:\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i, reason: "pii_dob" },
];

const SAFE_FALLBACK =
  "I'm not able to help with that right now. Please reach out to your advocate for support.";

// ---------------------------------------------------------------------------
// Layer 1 — Mode constraint
// ---------------------------------------------------------------------------

function layer1ModeConstraint(
  response: string,
  mode: AIModeKey,
): { triggered: boolean; reason: string | null } {
  const lower = response.toLowerCase();
  for (const pattern of getModeConfig(mode).forbiddenResponsePatterns) {
    if (lower.includes(pattern.toLowerCase())) {
      return { triggered: true, reason: `forbidden_pattern:${pattern}` };
    }
  }
  return { triggered: false, reason: null };
}

// ---------------------------------------------------------------------------
// Layer 2 — Policy/context check
// ---------------------------------------------------------------------------

function layer2ScopeCheck(
  response: string,
  mode: AIModeKey,
): { triggered: boolean; reason: string | null } {
  const scopes = getModeConfig(mode).allowedContextScopes as readonly string[];
  const lower = response.toLowerCase();
  const allAllowedKeywords = new Set<string>();
  for (const scope of scopes) {
    for (const kw of SCOPE_VIOLATION_KEYWORDS[scope] ?? []) {
      allAllowedKeywords.add(kw.toLowerCase());
    }
  }
  // If a known scope-violation keyword appears AND the current mode has a
  // policy listing it as violating, flag. The simple heuristic: a response
  // mentioning "case note" in a mode whose scope doesn't include case_summary
  // is treated as a scope breach.
  const allScopeEntries = Object.entries(SCOPE_VIOLATION_KEYWORDS);
  for (const [scope, keywords] of allScopeEntries) {
    if (scopes.includes(scope)) continue;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { triggered: true, reason: `out_of_scope:${scope}:${kw}` };
      }
    }
  }
  return { triggered: false, reason: null };
}

// ---------------------------------------------------------------------------
// Layer 3 — Content safety
// ---------------------------------------------------------------------------

function layer3ContentSafety(response: string): { triggered: boolean; reason: string | null } {
  for (const entry of CONTENT_SAFETY_PATTERNS) {
    if (entry.regex.test(response)) {
      return { triggered: true, reason: entry.reason };
    }
  }
  return { triggered: false, reason: null };
}

// ---------------------------------------------------------------------------
// Layer 4 — Disclaimer injection
// ---------------------------------------------------------------------------

function layer4AddDisclaimer(
  response: string,
  mode: AIModeKey,
): { response: string; added: boolean } {
  const key = getModeConfig(mode).disclaimerKey;
  if (!key) return { response, added: false };
  const disclaimer = getDisclaimer(key);
  if (response.includes(disclaimer.text.trim())) return { response, added: false };
  return { response: response + disclaimer.text, added: true };
}

// ---------------------------------------------------------------------------
// Layer 5 — Escalation on output
// ---------------------------------------------------------------------------

function layer5EscalationOnOutput(response: string): {
  triggered: boolean;
  detection: EscalationDetection;
} {
  // We run against the output text with a fresh counter — Layer 5 only cares
  // whether the model GENERATED crisis content, not session history.
  const detection = detectEscalation(response, 0, false);
  return {
    triggered: detection.triggered && detection.category === "safety_crisis",
    detection,
  };
}

// ---------------------------------------------------------------------------
// Public pipeline
// ---------------------------------------------------------------------------

export function runSafetyPipeline(rawResponse: string, mode: AIModeKey): SafetyResult {
  const layersFailed: string[] = [];
  let response = rawResponse;
  let safe = true;

  // Layer 1.
  const l1 = layer1ModeConstraint(response, mode);
  if (l1.triggered) {
    layersFailed.push(`layer1:${l1.reason ?? "unknown"}`);
    response = SAFE_FALLBACK;
    safe = false;
  }

  // Layer 2.
  const l2 = layer2ScopeCheck(response, mode);
  if (l2.triggered) {
    layersFailed.push(`layer2:${l2.reason ?? "unknown"}`);
    response = SAFE_FALLBACK;
    safe = false;
  }

  // Layer 3.
  const l3 = layer3ContentSafety(response);
  if (l3.triggered) {
    layersFailed.push(`layer3:${l3.reason ?? "unknown"}`);
    response = SAFE_FALLBACK;
    safe = false;
  }

  // Layer 4 — disclaimer injection. Only meaningful if the response is safe;
  // a fallback already carries its own tone.
  let disclaimerAdded = false;
  if (safe) {
    const l4 = layer4AddDisclaimer(response, mode);
    response = l4.response;
    disclaimerAdded = l4.added;
  }

  // Layer 5 — escalation scan on the FINAL output.
  const l5 = layer5EscalationOnOutput(response);
  const escalationFired = l5.triggered;
  if (l5.triggered) {
    layersFailed.push("layer5:model_generated_crisis_content");
    response = SAFE_FALLBACK;
    safe = false;
  }

  return {
    safe,
    response,
    disclaimerAdded,
    escalationFired,
    layersFailed,
    escalation: l5.detection,
  };
}
