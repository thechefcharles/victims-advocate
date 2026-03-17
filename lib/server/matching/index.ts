export type { MatchingInput, MatchEvaluation, OrgRowForMatching } from "./types";
export {
  buildMatchingInputFromApplication,
  buildMatchingInputFromCaseRow,
  parseCaseApplication,
} from "./normalize";
export {
  runCaseOrganizationMatching,
  runOrganizationMatchingWithOrgs,
  loadActiveOrganizations,
  persistOrganizationMatchRun,
  getLatestOrganizationMatchesForCase,
  explainOrganizationMatch,
} from "./service";
export type { RunCaseMatchingResult } from "./service";

import type { MatchingInput, MatchEvaluation } from "./types";
import { loadActiveOrganizations, runOrganizationMatchingWithOrgs } from "./service";

export async function runOrganizationMatching(params: {
  input: MatchingInput;
}): Promise<MatchEvaluation[]> {
  const orgs = await loadActiveOrganizations();
  const { matches } = await runOrganizationMatchingWithOrgs(params.input, orgs);
  return matches;
}

/** Alias per Phase B spec */
export { getLatestOrganizationMatchesForCase as getOrganizationMatchesForCase } from "./service";
