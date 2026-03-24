/**
 * Phase 2: organization profile stages for matching eligibility.
 * Implementation lives in {@link "@/lib/organizations/profileStage"} (shared, pure).
 */
export {
  computeOrganizationProfileStage,
  coverageAreaHasSignal,
  isOrganizationSearchable,
  listMissingForSearchable,
  listOptionalEnrichedHints,
  meetsSearchableMinimum,
} from "@/lib/organizations/profileStage";
