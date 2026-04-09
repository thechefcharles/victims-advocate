/**
 * Phase 0: Standardized API error envelope.
 */

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "CONSENT_REQUIRED"
  | "EMAIL_VERIFICATION_REQUIRED"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_DELETED"
  | "DOCUMENT_ACCESS_DENIED"
  | "DOCUMENT_RESTRICTED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_UPLOAD_INVALID"
  | "CONFLICT"
  | "INTERNAL";

const STATUS_MAP: Record<ErrorCode, number> = {
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
  DOCUMENT_ACCESS_DENIED: 403,
  DOCUMENT_RESTRICTED: 403,
  DOCUMENT_DELETED: 404,
  DOCUMENT_UPLOAD_INVALID: 422,
  CONFLICT: 409,
  INTERNAL: 500,
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly status?: number
  ) {
    super(message);
    this.name = "AppError";
  }

  get httpStatus(): number {
    return this.status ?? STATUS_MAP[this.code] ?? 500;
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  return new AppError("INTERNAL", msg, undefined, 500);
}
