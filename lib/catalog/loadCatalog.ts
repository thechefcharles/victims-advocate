import fs from "fs";
import path from "path";
import type { IlVictimAssistanceProgram } from "./ilProgramTypes";

let cached: IlVictimAssistanceProgram[] | null = null;

export function loadIlVictimAssistanceCatalog(): IlVictimAssistanceProgram[] {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "public", "data", "il-victim-assistance-programs.json");
  const raw = fs.readFileSync(filePath, "utf8");
  cached = JSON.parse(raw) as IlVictimAssistanceProgram[];
  return cached;
}

export function getCatalogProgramById(id: number): IlVictimAssistanceProgram | null {
  const list = loadIlVictimAssistanceCatalog();
  return list.find((p) => p.id === id) ?? null;
}
