/**
 * Phase 14: Command center – org-scoped summary, alerts, case list with search/sort/filter, workload.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  loadCommandCenterData,
  type CommandCenterFilters,
  type CommandCenterSort,
} from "@/lib/server/commandCenter/load";

const SORT_VALUES: CommandCenterSort[] = [
  "priority",
  "last_activity",
  "status",
  "created_at",
];

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireRole(ctx, "advocate");

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const assigned_to = url.searchParams.get("assigned_to") ?? undefined;
    const priority = url.searchParams.get("priority") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const only_unassigned = url.searchParams.get("only_unassigned") === "true";
    const only_with_alerts = url.searchParams.get("only_with_alerts") === "true";
    const sortParam = url.searchParams.get("sort") ?? "priority";
    const sort: CommandCenterSort = SORT_VALUES.includes(sortParam as CommandCenterSort)
      ? (sortParam as CommandCenterSort)
      : "priority";

    const filters: CommandCenterFilters = {};
    if (status) filters.status = status;
    if (assigned_to) filters.assigned_to = assigned_to;
    if (priority) filters.priority = priority;
    if (search) filters.search = search;
    if (only_unassigned) filters.only_unassigned = true;
    if (only_with_alerts) filters.only_with_alerts = true;

    const data = await loadCommandCenterData({ ctx, filters, sort });

    await logEvent({
      ctx,
      action: "command_center.viewed",
      resourceType: "command_center",
      organizationId: ctx.orgId,
      metadata: {
        has_search: Boolean(search),
        has_filter: Boolean(status || assigned_to || priority || only_unassigned || only_with_alerts),
        sort,
        case_count: data.cases.length,
      },
    });
    if (search) {
      await logEvent({
        ctx,
        action: "command_center.search_used",
        resourceType: "command_center",
        organizationId: ctx.orgId,
        metadata: { search },
      });
    }
    if (status || assigned_to || priority || only_unassigned || only_with_alerts) {
      await logEvent({
        ctx,
        action: "command_center.filter_used",
        resourceType: "command_center",
        organizationId: ctx.orgId,
        metadata: { filters: { status, assigned_to, priority, only_unassigned, only_with_alerts } },
      });
    }

    logger.info("advocate.command_center.viewed", {
      userId: ctx.userId,
      orgId: ctx.orgId,
      caseCount: data.cases.length,
    });

    return NextResponse.json(data);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.command_center.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
