/**
 * Domain 3.3 — Program search index sync.
 *
 * NOTE: The existing search infrastructure (provider_search_index) is org-centric
 * and not compatible with program_definitions indexing — it syncs org rows with
 * geography, service_types, and capacity. Program definitions have a different shape.
 *
 * [DEFERRED-3.3-001] Full-text program search index. The existing search layer
 * (provider_search_index) does not support program definition documents.
 * Suggested resolution in Domain 3.5+ once a program discovery surface is scoped.
 *
 * This stub logs mutations for observability without failing. Remove when real
 * program search infrastructure is added.
 */

export async function updateProviderSearchIndexFromProgram(
  programId: string,
  operation: "upsert" | "remove"
): Promise<void> {
  console.log(
    `[programSearchSync] TODO: sync program ${programId} (${operation}) — search index deferred (DEFERRED-3.3-001)`
  );
}
