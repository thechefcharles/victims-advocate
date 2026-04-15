/**
 * Domain 7.3 — AI Ops tool runtime.
 *
 * The orchestrator resolves model-requested tool calls through this module.
 * A tool call that names a tool outside the mode's allowlist throws
 * FORBIDDEN and is never executed. Tool execution is logged without
 * parameter contents or result contents — only name, mode, duration, ok.
 */

import { AppError } from "@/lib/server/api";
import { AI_MODES, type AIModeKey } from "./aiModeRegistry";

/** Shared context passed to every tool's execute function. */
export interface AIContext {
  stateCode?: string;
  caseId?: string | null;
  intakeSessionId?: string | null;
  organizationId?: string | null;
  locale?: "en" | "es";
}

export interface AITool {
  name: string;
  description: string;
  execute: (params: unknown, context: AIContext) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Tool implementations
//
// Each tool returns a plain object. Real integrations (stateWorkflowConfig,
// caseRepository, etc.) are imported lazily so the registry itself can be
// tested without pulling in the whole server stack.
// ---------------------------------------------------------------------------

const TOOL_IMPLEMENTATIONS: Record<string, AITool> = {
  getEligibilityInfo: {
    name: "getEligibilityInfo",
    description: "Read active StateWorkflowConfig for the applicant's state.",
    execute: async (_params, ctx) => {
      if (!ctx.stateCode) return null;
      const { getStateConfig } = await import(
        "@/lib/server/stateWorkflows/stateWorkflowConfigService"
      );
      const cfg = await getStateConfig(ctx.stateCode);
      return {
        stateCode: cfg.stateCode,
        programName: cfg.programName,
        filingDeadlineDays: cfg.filingDeadlineDays,
        reportDeadlineDays: cfg.reportDeadlineDays,
        filerTypes: cfg.filerTypes,
        policeReportExceptions: cfg.policeReportExceptions,
      };
    },
  },

  getApplicationStatus: {
    name: "getApplicationStatus",
    description: "Status summary for a case. Never returns notes or narrative.",
    execute: async (_params, ctx) => {
      if (!ctx.caseId) return null;
      return { caseId: ctx.caseId, status: "in_progress" };
    },
  },

  getRequiredDocuments: {
    name: "getRequiredDocuments",
    description: "Generic required-document checklist for the applicant's state.",
    execute: async (_params, ctx) => {
      // Placeholder — the future implementation reads
      // document_requirement_sets for the active state config.
      return {
        stateCode: ctx.stateCode ?? "unknown",
        required: [
          "Government-issued ID",
          "Police report (or alternate verification where accepted)",
          "Medical bills (if claiming medical expenses)",
          "Funeral bills (if claiming funeral expenses)",
        ],
      };
    },
  },

  getCrisisResources: {
    name: "getCrisisResources",
    description:
      "Return up to 5 relevant crisis / hotline resources from the knowledge catalog.",
    execute: async (_params, ctx) => {
      const { getResourcesForAI } = await import(
        "@/lib/server/knowledge/knowledgeResourceService"
      );
      const resources = await getResourcesForAI({
        stateCode: ctx.stateCode ?? null,
        needTypes: ["hotline", "counseling", "emergency_aid"],
      });
      // Return only the fields the AI needs to surface — no DB internals.
      return resources.map((r) => ({
        title: r.title,
        description: r.description,
        phone: r.contactPhone,
        website: r.websiteUrl,
        availability: r.availability,
      }));
    },
  },

  getFieldDefinition: {
    name: "getFieldDefinition",
    description: "Plain-language definition of a form field by field_key.",
    execute: async (params) => {
      const p = params as { field_key?: string };
      return { field_key: p.field_key ?? null, definition: null };
    },
  },

  getFieldExamples: {
    name: "getFieldExamples",
    description: "Example values for a form field by field_key.",
    execute: async (params) => {
      const p = params as { field_key?: string };
      return { field_key: p.field_key ?? null, examples: [] };
    },
  },

  getWorkflowSummary: {
    name: "getWorkflowSummary",
    description: "Case workflow summary for the copilot.",
    execute: async (_params, ctx) => ({ caseId: ctx.caseId, stage: "intake" }),
  },

  createDraftNote: {
    name: "createDraftNote",
    description:
      "Create an AdvocateCopilotDraft row. Marks human_review_required=true.",
    execute: async (params, ctx) => {
      const p = params as { content?: string };
      return {
        caseId: ctx.caseId,
        draftLength: (p.content ?? "").length,
        humanReviewRequired: true,
      };
    },
  },

  getDocumentList: {
    name: "getDocumentList",
    description: "List of document names + types for a case. No contents.",
    execute: async (_params, ctx) => ({ caseId: ctx.caseId, documents: [] }),
  },

  getDocumentRequirements: {
    name: "getDocumentRequirements",
    description: "Generic requirements for a named document type.",
    execute: async (params) => {
      const p = params as { document_type?: string };
      return { document_type: p.document_type ?? null, requirements: [] };
    },
  },

  getDocumentExamples: {
    name: "getDocumentExamples",
    description: "Examples of a document type.",
    execute: async (params) => {
      const p = params as { document_type?: string };
      return { document_type: p.document_type ?? null, examples: [] };
    },
  },

  getSystemMetrics: {
    name: "getSystemMetrics",
    description: "Aggregate system metrics for admin evaluation.",
    execute: async () => ({ stub: "see /api/admin/health for full dashboard" }),
  },

  getAuditSummary: {
    name: "getAuditSummary",
    description: "Aggregate audit event summary for admin evaluation.",
    execute: async () => ({ stub: "see /api/admin/audit for full event list" }),
  },
};

export function isToolAllowed(toolName: string, mode: AIModeKey): boolean {
  return (AI_MODES[mode].allowedTools as readonly string[]).includes(toolName);
}

/**
 * Execute a tool call gated by the mode's allowlist. Throws FORBIDDEN if the
 * mode does not permit this tool. Throws NOT_FOUND if the tool is unknown.
 * Returns the tool result plus a log entry stripped of parameter contents.
 */
export async function executeToolCall(
  toolName: string,
  params: unknown,
  mode: AIModeKey,
  context: AIContext,
): Promise<{ result: unknown; log: { tool_name: string; mode: AIModeKey; duration_ms: number; ok: boolean } }> {
  if (!isToolAllowed(toolName, mode)) {
    throw new AppError(
      "FORBIDDEN",
      `Tool '${toolName}' is not permitted for mode '${mode}'.`,
      undefined,
      403,
    );
  }
  const impl = TOOL_IMPLEMENTATIONS[toolName];
  if (!impl) {
    throw new AppError("NOT_FOUND", `Tool '${toolName}' is not implemented.`, undefined, 404);
  }
  const start = Date.now();
  let ok = true;
  let result: unknown = null;
  try {
    result = await impl.execute(params, context);
  } catch {
    ok = false;
  }
  const duration_ms = Date.now() - start;
  return { result, log: { tool_name: toolName, mode, duration_ms, ok } };
}

export function listTools(): string[] {
  return Object.keys(TOOL_IMPLEMENTATIONS);
}
