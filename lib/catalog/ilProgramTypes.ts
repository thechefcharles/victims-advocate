/**
 * Illinois Crime Victim Assistance Services Directory — program entry (PDF line # = id).
 * Shape matches public/data/il-victim-assistance-programs.json
 */
export type IlVictimAssistanceProgram = {
  id: number;
  organization: string;
  programType: string;
  address: string;
  phone: string;
  website: string | null;
};

/** Map directory program type → organizations.type check constraint */
export function programTypeToOrgType(programType: string): "nonprofit" | "hospital" | "gov" | "other" {
  const p = programType.toLowerCase();
  if (p.includes("medical center") || p.includes("hospital") || p.includes("rehabilitation")) {
    return "hospital";
  }
  if (
    p.includes("prosecution") ||
    p.includes("state's attorney") ||
    p.includes("sheriff") ||
    p.includes("police based")
  ) {
    return "gov";
  }
  return "nonprofit";
}
