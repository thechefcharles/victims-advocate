import { getCatalogProgramById } from "@/lib/catalog/loadCatalog";
import { programTypeToOrgType } from "@/lib/catalog/ilProgramTypes";

/** Maps a directory row to `organizations` columns (same rules as org registration). */
export function orgRowFromCatalogEntry(catalogEntryId: number): {
  name: string;
  type: string;
  catalog_entry_id: number;
  metadata: Record<string, unknown>;
} | null {
  const program = getCatalogProgramById(catalogEntryId);
  if (!program) return null;
  return {
    name: `${program.organization} — ${program.programType}`,
    type: programTypeToOrgType(program.programType),
    catalog_entry_id: program.id,
    metadata: { catalog_program: program },
  };
}
