/**
 * GET /api/intake/template-fields?stateCode=IL&filerType=self_filing_adult
 *
 * Returns the active template's applicant-visible fields, grouped by
 * section_key, sorted by display_order. Authenticated users only.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getTemplateFields } from "@/lib/server/intakeV2/templateFieldsService";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const url = new URL(req.url);
    const stateCode = url.searchParams.get("stateCode");
    const filerType = url.searchParams.get("filerType");
    if (!stateCode) return apiFail("VALIDATION_ERROR", "stateCode required.");
    const result = await getTemplateFields(stateCode, filerType);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake.template_fields.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
