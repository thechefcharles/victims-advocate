/**
 * Phase 10: Public/app – search knowledge entries (active only).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { searchKnowledgeEntries } from "@/lib/server/knowledge";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const query = url.searchParams.get("query") ?? url.searchParams.get("q");
    const category = url.searchParams.get("category");
    const stateCodeRaw = url.searchParams.get("stateCode") ?? url.searchParams.get("state_code");
    const programKeyRaw = url.searchParams.get("programKey") ?? url.searchParams.get("program_key");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "20", 10) || 20,
      50
    );

    const entries = await searchKnowledgeEntries({
      query: query?.trim() || null,
      category: category?.trim() || null,
      stateCode: stateCodeRaw?.trim() || null,
      programKey: programKeyRaw?.trim() || null,
      includeInactive: false,
      limit,
    });

    return apiOk({ entries });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("knowledge.search.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
