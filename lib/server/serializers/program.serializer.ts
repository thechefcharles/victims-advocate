/**
 * Domain 3.3 — Program definition serializer.
 * Strips reserved fields (dependency_rules, stacking_rules, created_by, updated_by).
 */

import type { ProgramDefinitionRow } from "@/lib/server/routing/types";

export interface SerializedProgram {
  id: string;
  program_key: string;
  name: string;
  description: string | null;
  state_code: string | null;
  scope_type: string;
  status: string;
  is_active: boolean;
  version: string;
  rule_set: unknown;
  required_documents: unknown;
  deadline_metadata: unknown;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export function serializeProgramDefinition(row: ProgramDefinitionRow): SerializedProgram {
  return {
    id: row.id,
    program_key: row.program_key,
    name: row.name,
    description: row.description,
    state_code: row.state_code,
    scope_type: row.scope_type,
    status: row.status,
    is_active: row.is_active,
    version: row.version,
    rule_set: row.rule_set,
    required_documents: row.required_documents,
    deadline_metadata: row.deadline_metadata,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
