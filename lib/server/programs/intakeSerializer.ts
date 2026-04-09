/**
 * Domain 3.3 — Intake serializer.
 * Strips internal UI metadata keys before passing application data to evaluateProgram().
 *
 * Note: intakeFromApplication() already exists in lib/server/routing/evaluate.ts.
 * This module re-exports it as a canonical import path from the program domain.
 */
export { intakeFromApplication } from "@/lib/server/routing/evaluate";
