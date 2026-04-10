/**
 * Domain 3.3 — Program Domain typed errors.
 */

export class ProgramNotFoundError extends Error {
  readonly code = "PROGRAM_NOT_FOUND";
  constructor(id: string) {
    super(`Program definition not found: ${id}`);
    this.name = "ProgramNotFoundError";
  }
}

export class ProgramStateError extends Error {
  readonly code = "PROGRAM_STATE_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "ProgramStateError";
  }
}

export class CatalogEntryNotFoundError extends Error {
  readonly code = "CATALOG_ENTRY_NOT_FOUND";
  constructor(id: number) {
    super(`Catalog entry not found: ${id}`);
    this.name = "CatalogEntryNotFoundError";
  }
}

export class CatalogEntryDuplicateError extends Error {
  readonly code = "CATALOG_ENTRY_DUPLICATE";
  constructor(id: number) {
    super(`Catalog entry ${id} is already linked to another organization`);
    this.name = "CatalogEntryDuplicateError";
  }
}
