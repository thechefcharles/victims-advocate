/**
 * Domain 6.1 — Methodology endpoints (admin only).
 *
 * GET  /api/trust/methodology       — list methodologies
 * POST /api/trust/methodology       — create new draft
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  createScoreMethodology,
  listScoreMethodologies,
} from "@/lib/server/trust/scoreMethodologyService";
import { serializeMethodology } from "@/lib/server/trust/trustSerializer";
import { z } from "zod";

const createBody = z.object({
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  categoryDefinitions: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      signalTypes: z.array(z.string()),
    }),
  ),
  weights: z.record(z.string(), z.number()),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("score_methodology:view", actor, {
      type: "trust",
      id: null,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const methodologies = await listScoreMethodologies();
    return apiOk({ methodologies: methodologies.map(serializeMethodology) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.methodology.list.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("score_methodology:update", actor, {
      type: "trust",
      id: null,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json();
    const parsed = createBody.safeParse(body);
    if (!parsed.success) {
      return apiFail(
        "VALIDATION_ERROR",
        "Invalid methodology input.",
        parsed.error.flatten(),
        422,
      );
    }

    const created = await createScoreMethodology({
      ...parsed.data,
      description: parsed.data.description ?? null,
      createdByUserId: ctx.userId,
    });
    return apiOk({ methodology: serializeMethodology(created) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.methodology.create.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}
