/**
 * Phase 11: Evaluate single rules and rule groups against intake (deterministic).
 */

import type { SingleRule, RuleGroup, RuleSet } from "./types";
import type { ConditionOutcome } from "./types";

export type IntakeLike = Record<string, unknown>;

/** Get value at dot path from intake. */
export function getValue(intake: IntakeLike, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = intake;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

function isUnknown(val: unknown): boolean {
  return val === undefined || val === null || (typeof val === "string" && val.trim() === "");
}

/** Evaluate one rule; returns "matched" | "failed" | "unknown". */
export function evaluateRule(intake: IntakeLike, rule: SingleRule): ConditionOutcome {
  const actual = getValue(intake, rule.field);
  const unknown = isUnknown(actual) && rule.op !== "exists";

  if (unknown && rule.op !== "exists") {
    return {
      field: rule.field,
      op: rule.op,
      value: rule.value,
      result: "unknown",
      actualValue: actual,
    };
  }

  let matched = false;
  switch (rule.op) {
    case "exists":
      matched = actual !== undefined && actual !== null && actual !== "";
      break;
    case "eq":
      matched = actual === rule.value;
      break;
    case "neq":
      matched = actual !== rule.value;
      break;
    case "in":
      matched = Array.isArray(rule.value) && rule.value.includes(actual);
      break;
    case "gte":
      matched = typeof actual === "number" && typeof rule.value === "number" && actual >= rule.value;
      break;
    case "lte":
      matched = typeof actual === "number" && typeof rule.value === "number" && actual <= rule.value;
      break;
    case "truthy":
      matched = Boolean(actual);
      break;
    default:
      matched = false;
  }

  return {
    field: rule.field,
    op: rule.op,
    value: rule.value,
    result: matched ? "matched" : "failed",
    actualValue: actual,
  };
}

function isSingleRule(r: SingleRule | RuleGroup): r is SingleRule {
  return "field" in r && "op" in r;
}

/** Evaluate a group (all/any). Returns list of outcomes and whether the group passed. */
export function evaluateGroup(
  intake: IntakeLike,
  group: RuleGroup
): { outcomes: ConditionOutcome[]; passed: boolean } {
  const outcomes: ConditionOutcome[] = [];
  const allRules = group.all ?? [];
  const anyRules = group.any ?? [];

  for (const r of allRules) {
    if (isSingleRule(r)) {
      const o = evaluateRule(intake, r);
      outcomes.push(o);
    }
  }
  for (const r of anyRules) {
    if (isSingleRule(r)) {
      const o = evaluateRule(intake, r);
      outcomes.push(o);
    }
  }

  const allPassed = allRules.length === 0 || outcomes.filter((o) => o.field && (group.all?.some((ar) => isSingleRule(ar) && ar.field === o.field))).every((o) => o.result === "matched");
  const anyOutcomes = outcomes.filter((o) => group.any?.some((ar) => isSingleRule(ar) && ar.field === o.field));
  const anyPassed = anyRules.length === 0 || anyOutcomes.some((o) => o.result === "matched");

  const passed = allPassed && anyPassed;
  return { outcomes, passed };
}

/** Flatten rule set into a list of single rules and evaluate all. */
export function evaluateRuleSet(intake: IntakeLike, ruleSet: RuleSet): ConditionOutcome[] {
  const outcomes: ConditionOutcome[] = [];
  const all = ruleSet.all ?? [];
  const any = ruleSet.any ?? [];

  for (const item of all) {
    if (isSingleRule(item)) {
      outcomes.push(evaluateRule(intake, item));
    } else {
      const { outcomes: groupOutcomes } = evaluateGroup(intake, item as RuleGroup);
      outcomes.push(...groupOutcomes);
    }
  }
  for (const item of any) {
    if (isSingleRule(item)) {
      outcomes.push(evaluateRule(intake, item));
    } else {
      const { outcomes: groupOutcomes } = evaluateGroup(intake, item as RuleGroup);
      outcomes.push(...groupOutcomes);
    }
  }

  return outcomes;
}

/** Result of evaluating a full rule set: outcomes and whether the set passed. */
export interface RuleSetEval {
  matched: ConditionOutcome[];
  failed: ConditionOutcome[];
  unknown: ConditionOutcome[];
  /** True when every "all" rule matched and at least one "any" rule matched. */
  passed: boolean;
}

/** Evaluate full rule set and return grouped outcomes and pass/fail. */
export function evaluateRuleSetFull(intake: IntakeLike, ruleSet: RuleSet): RuleSetEval {
  const outcomes = evaluateRuleSet(intake, ruleSet);
  const matched: ConditionOutcome[] = [];
  const failed: ConditionOutcome[] = [];
  const unknown: ConditionOutcome[] = [];
  for (const o of outcomes) {
    if (o.result === "matched") matched.push(o);
    else if (o.result === "failed") failed.push(o);
    else unknown.push(o);
  }

  const all = ruleSet.all ?? [];
  const any = ruleSet.any ?? [];
  const collectOutcomes = (items: (SingleRule | RuleGroup)[]): ConditionOutcome[] => {
    const out: ConditionOutcome[] = [];
    for (const item of items) {
      if (isSingleRule(item)) out.push(evaluateRule(intake, item));
      else out.push(...evaluateGroup(intake, item as RuleGroup).outcomes);
    }
    return out;
  };
  const allOutcomes = collectOutcomes(all);
  const anyOutcomes = collectOutcomes(any);
  const allPassed = allOutcomes.length === 0 || allOutcomes.every((o) => o.result === "matched");
  const anyPassed = anyOutcomes.length === 0 || anyOutcomes.some((o) => o.result === "matched");
  const passed = allPassed && anyPassed;

  return { matched, failed, unknown, passed };
}
