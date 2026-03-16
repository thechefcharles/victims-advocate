/**
 * Phase 0: Standardized API response envelope.
 */

import { NextResponse } from "next/server";
import { AppError } from "./errors";

export type ApiOkMeta = Record<string, unknown>;

export function apiOk<T>(data: T, meta?: ApiOkMeta, status = 200) {
  const body = meta ? { ok: true, data, meta } : { ok: true, data };
  return NextResponse.json(body, { status });
}

export function apiFail(
  code: string,
  message: string,
  details?: unknown,
  status?: number
) {
  const statusMap: Record<string, number> = {
    AUTH_REQUIRED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 422,
    RATE_LIMITED: 429,
    CONSENT_REQUIRED: 403,
    EMAIL_VERIFICATION_REQUIRED: 403,
    ACCOUNT_LOCKED: 429,
    ACCOUNT_DISABLED: 403,
    ACCOUNT_DELETED: 403,
    INTERNAL: 500,
  };
  const httpStatus = status ?? statusMap[code] ?? 500;
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details },
      message, // backward compat: clients reading json.error as string can use json.message
    },
    { status: httpStatus }
  );
}

export function apiFailFromError(err: AppError) {
  return apiFail(
    err.code,
    err.message,
    err.details,
    err.httpStatus
  );
}
