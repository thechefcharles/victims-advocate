/**
 * Public organization + program views returned by provider discovery APIs.
 */

export type {
  PublicProviderProfile,
  PublicProgramView,
} from "@/lib/server/orgPrograms/publicProviderProfile";

// Canonical program shape — the authoritative typing lives in the service
// module; re-exported here so mobile / future clients can type their calls.
// CapacityStatus already exported from ./search — omit to avoid barrel
// re-export conflict in index.ts.
export type { Program, ProgramType } from "@/lib/server/orgPrograms/orgProgramService";
