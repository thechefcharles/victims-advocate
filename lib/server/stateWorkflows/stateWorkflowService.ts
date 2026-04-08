/**
 * Domain 2.2 — State Workflows: service layer.
 *
 * Central orchestration. Every mutating function: can() → validate → execute
 * → signal/audit. Status changes go through the workflow engine (Rule 16).
 *
 * Trust signals: state_config_published, state_config_deprecated, state_config_updated
 * are emitted org-less (organizationId=null) because state_workflow_configs are
 * platform-wide, not org-scoped. We use a synthetic org id of "platform" for
 * the signal? — NO. The trust signal infrastructure is org-keyed and we do
 * not want to fabricate platform rows. Instead we emit the signal only if
 * an organizationId can be derived. For state workflow events that means we
 * never emit through emitSignal (which requires orgId). The publication and
 * deprecation events are still recorded in the audit log + the workflow_state_log
 * via transition() — those are the canonical record.
 *
 * Open question for a future trust-signal pass: extend emitSignal to support
 * platform-scoped signals. Tracked in deferred items.
 *
 * Data class: Class C — Controlled Business.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { transition } from "@/lib/server/workflow/engine";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AuthContext } from "@/lib/server/auth/context";
import type { PolicyResource } from "@/lib/server/policy/policyTypes";
import {
  getConfigById,
  getConfigWithSets,
  getMaxVersionForState,
  listConfigs,
  insertConfig,
  updateConfigStatus,
  updateConfigFields,
} from "./stateWorkflowRepository";
import { validateConfigCompleteness } from "./configValidation";
import { invalidateWorkflowDerivedData } from "./invalidation";
import { serializeForAdmin, serializeForRuntime } from "./stateWorkflowSerializer";
import type {
  StateWorkflowConfigRecord,
  StateWorkflowConfigStatus,
  StateWorkflowConfigWithSets,
  CreateStateWorkflowConfigInput,
  UpdateStateWorkflowConfigInput,
  AdminConfigView,
  RuntimeConfigView,
} from "./stateWorkflowTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function configToResource(record: StateWorkflowConfigRecord): PolicyResource {
  return {
    type: "state_workflow_config",
    id: record.id,
    status: record.status,
    // No tenantId — state workflow configs are platform-wide.
  };
}

function denyForbidden(reason?: string): never {
  throw new AppError("FORBIDDEN", reason ?? "Access denied.");
}

async function loadOrThrow(
  supabase: SupabaseClient,
  id: string,
): Promise<StateWorkflowConfigRecord> {
  const record = await getConfigById(supabase, id);
  if (!record) throw new AppError("NOT_FOUND", "State workflow config not found.");
  return record;
}

async function loadWithSetsOrThrow(
  supabase: SupabaseClient,
  id: string,
): Promise<StateWorkflowConfigWithSets> {
  const wrapped = await getConfigWithSets(supabase, id);
  if (!wrapped) throw new AppError("NOT_FOUND", "State workflow config not found.");
  return wrapped;
}

// ---------------------------------------------------------------------------
// Read — runtime path
// ---------------------------------------------------------------------------

/**
 * Returns the active config (with all child sets) for the given state in
 * RuntimeConfigView shape — safe for any authenticated consumer.
 */
export async function getActiveStateWorkflowConfig(
  ctx: AuthContext,
  stateCode: "IL" | "IN",
  supabase: SupabaseClient,
): Promise<RuntimeConfigView | null> {
  const actor = buildActor(ctx);
  const decision = await can("state_workflow:resolve_active_config", actor, {
    type: "state_workflow_config",
    id: null,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const wrapped = await loadActiveWithSets(supabase, stateCode);
  if (!wrapped) return null;
  return serializeForRuntime(wrapped);
}

async function loadActiveWithSets(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
): Promise<StateWorkflowConfigWithSets | null> {
  const list = await listConfigs(supabase, { stateCode, status: "active" });
  if (list.length === 0) return null;
  return getConfigWithSets(supabase, list[0]!.id);
}

// ---------------------------------------------------------------------------
// Read — admin path
// ---------------------------------------------------------------------------

export async function getStateWorkflowConfigById(
  ctx: AuthContext,
  configId: string,
  supabase: SupabaseClient,
): Promise<AdminConfigView> {
  const wrapped = await loadWithSetsOrThrow(supabase, configId);

  const actor = buildActor(ctx);
  const decision = await can("state_workflow:view", actor, configToResource(wrapped.config));
  if (!decision.allowed) denyForbidden(decision.message);

  return serializeForAdmin(wrapped);
}

export async function listStateWorkflowConfigs(
  ctx: AuthContext,
  filters: { stateCode?: "IL" | "IN"; status?: StateWorkflowConfigStatus },
  supabase: SupabaseClient,
): Promise<AdminConfigView[]> {
  const actor = buildActor(ctx);
  const decision = await can("state_workflow:list", actor, {
    type: "state_workflow_config",
    id: null,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const records = await listConfigs(supabase, filters);
  // Hydrate each row with its sets to compute validation_state
  const wrapped = await Promise.all(
    records.map(async (rec) => {
      const ws = await getConfigWithSets(supabase, rec.id);
      return ws;
    }),
  );
  return wrapped
    .filter((w): w is StateWorkflowConfigWithSets => w !== null)
    .map((w) => serializeForAdmin(w));
}

// ---------------------------------------------------------------------------
// Mutations — create / update / publish / deprecate
// ---------------------------------------------------------------------------

export async function createStateWorkflowConfig(
  ctx: AuthContext,
  input: CreateStateWorkflowConfigInput,
  supabase: SupabaseClient,
): Promise<AdminConfigView> {
  const actor = buildActor(ctx);
  const decision = await can("state_workflow:update_config", actor, {
    type: "state_workflow_config",
    id: null,
    status: "draft",
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const maxVersion = await getMaxVersionForState(supabase, input.state_code);
  const record = await insertConfig(supabase, {
    ...input,
    version_number: maxVersion + 1,
    created_by: ctx.userId,
  });

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "state_workflow_config",
    resourceId: record.id,
    severity: "info",
    metadata: {
      action_subtype: "state_workflow.created",
      state_code: record.state_code,
      version_number: record.version_number,
    },
  });

  const wrapped = await loadWithSetsOrThrow(supabase, record.id);
  return serializeForAdmin(wrapped);
}

export async function updateStateWorkflowConfig(
  ctx: AuthContext,
  configId: string,
  patch: UpdateStateWorkflowConfigInput,
  supabase: SupabaseClient,
): Promise<AdminConfigView> {
  const record = await loadOrThrow(supabase, configId);

  if (record.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      "State workflow configs can only be edited while in draft status.",
    );
  }

  const actor = buildActor(ctx);
  const decision = await can("state_workflow:update_config", actor, configToResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const updated = await updateConfigFields(supabase, configId, patch);

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "state_workflow_config",
    resourceId: updated.id,
    severity: "info",
    metadata: {
      action_subtype: "state_workflow.updated",
      state_code: updated.state_code,
    },
  });

  const wrapped = await loadWithSetsOrThrow(supabase, updated.id);
  return serializeForAdmin(wrapped);
}

export async function publishStateWorkflowConfig(
  ctx: AuthContext,
  configId: string,
  supabase: SupabaseClient,
): Promise<AdminConfigView> {
  const wrapped = await loadWithSetsOrThrow(supabase, configId);

  // Validation gate FIRST — before policy, before transition.
  const validation = validateConfigCompleteness(wrapped);
  if (!validation.valid) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot publish: missing required pieces: ${validation.missingPieces.join(", ")}`,
      { missingPieces: validation.missingPieces },
    );
  }

  const actor = buildActor(ctx);
  const decision = await can(
    "state_workflow:publish_version",
    actor,
    configToResource(wrapped.config),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  // Transition Law (Rule 16): go through the workflow engine.
  const result = await transition(
    {
      entityType: "state_workflow_config_status",
      entityId: wrapped.config.id,
      fromState: wrapped.config.status,
      toState: "active",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: undefined,
      metadata: {
        state_code: wrapped.config.state_code,
        version_number: wrapped.config.version_number,
      },
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateConfigStatus(supabase, configId, "active", {
    published_at: new Date().toISOString(),
  });

  // Invalidation hook — must run on every publish (Rule from execution prompt).
  await invalidateWorkflowDerivedData(updated.state_code, updated.id);

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "state_workflow_config",
    resourceId: updated.id,
    severity: "info",
    metadata: {
      action_subtype: "state_workflow.published",
      state_code: updated.state_code,
      version_number: updated.version_number,
    },
  });

  const finalWrapped = await loadWithSetsOrThrow(supabase, updated.id);
  return serializeForAdmin(finalWrapped);
}

export async function deprecateStateWorkflowConfig(
  ctx: AuthContext,
  configId: string,
  supabase: SupabaseClient,
): Promise<AdminConfigView> {
  const record = await loadOrThrow(supabase, configId);

  const actor = buildActor(ctx);
  const decision = await can(
    "state_workflow:deprecate_version",
    actor,
    configToResource(record),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "state_workflow_config_status",
      entityId: record.id,
      fromState: record.status,
      toState: "deprecated",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: undefined,
      metadata: {
        state_code: record.state_code,
        version_number: record.version_number,
      },
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateConfigStatus(supabase, configId, "deprecated", {
    deprecated_at: new Date().toISOString(),
  });

  // Invalidation hook — also fires on deprecate.
  await invalidateWorkflowDerivedData(updated.state_code, updated.id);

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "state_workflow_config",
    resourceId: updated.id,
    severity: "info",
    metadata: {
      action_subtype: "state_workflow.deprecated",
      state_code: updated.state_code,
      version_number: updated.version_number,
    },
  });

  const wrapped = await loadWithSetsOrThrow(supabase, updated.id);
  return serializeForAdmin(wrapped);
}
