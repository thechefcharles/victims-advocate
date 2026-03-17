/**
 * Phase 12: Aggregate required documents and fields from routing, program definitions, and KB.
 */

import { getKnowledgeEntriesForContext } from "@/lib/server/knowledge/retrieval";
import { REQUIRED_FIELD_KEYS } from "@/lib/intake/reviewStatus";
import type { ProgramRoutingResult } from "@/lib/server/routing/types";
import type { AggregatedRequirements } from "./types";

/** Core intake required field keys (same as review step). */
export const CORE_REQUIRED_FIELD_KEYS = [...REQUIRED_FIELD_KEYS] as readonly string[];

/**
 * Aggregate requirements for each program from routing result and KB.
 * - required_documents: from routing program.required_documents, merged with KB documents category structured_data
 * - required_fields: core intake fields (v1 same for all programs)
 */
export async function aggregateRequirementsForPrograms(
  routingPrograms: ProgramRoutingResult[],
  stateCode?: string | null
): Promise<AggregatedRequirements[]> {
  const out: AggregatedRequirements[] = [];

  for (const prog of routingPrograms) {
    const required_documents =
      Array.isArray(prog.required_documents) && prog.required_documents.length > 0
        ? [...prog.required_documents]
        : ["Police report", "Proof of loss"];

    const docLabels: Record<string, string> = {};
    const kbEntries = await getKnowledgeEntriesForContext({
      category: "documents",
      stateCode: stateCode ?? undefined,
      programKey: prog.program_key,
      limit: 5,
    });
    for (const e of kbEntries) {
      const title = (e as { title?: string }).title;
      const structured = (e as { structured_data?: { required_documents?: string[] } }).structured_data;
      if (title) {
        const list = structured?.required_documents;
        if (Array.isArray(list)) for (const d of list) docLabels[d] = title;
        else docLabels[title] = title;
      }
    }

    out.push({
      program_key: prog.program_key,
      program_name: prog.program_name,
      required_documents: [...new Set(required_documents)],
      required_fields: [...CORE_REQUIRED_FIELD_KEYS],
      document_labels: Object.keys(docLabels).length > 0 ? docLabels : undefined,
    });
  }

  return out;
}
