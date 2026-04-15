"use client";

/**
 * Wrapper that hides its children when a field's conditional_on rule is not
 * satisfied by the current answers map. Centralizes the rule semantics so
 * page code never branches on operator strings directly.
 */

import type { ReactNode } from "react";
import type { ConditionalRule } from "./types";
import { evaluateConditional } from "./conditionalEval";

interface Props {
  rule: ConditionalRule | null;
  answers: Record<string, unknown>;
  children: ReactNode;
}

export function ConditionalField({ rule, answers, children }: Props) {
  if (!evaluateConditional(rule, answers)) return null;
  return <>{children}</>;
}
