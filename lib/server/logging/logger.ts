/**
 * Phase 0: Structured logger skeleton (no DB yet).
 * Outputs JSON-like structured logs. PHASE 1: will feed audit logs.
 */

import { redact } from "./redact";

export type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function formatLog(level: LogLevel, event: string, payload?: LogPayload): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
  };
  if (payload && Object.keys(payload).length > 0) {
    entry.payload = redact(payload);
  }
  return JSON.stringify(entry);
}

function write(level: LogLevel, event: string, payload?: LogPayload) {
  const line = formatLog(level, event, payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(event: string, payload?: LogPayload) {
    write("info", event, payload);
  },
  warn(event: string, payload?: LogPayload) {
    write("warn", event, payload);
  },
  error(event: string, payload?: LogPayload) {
    write("error", event, payload);
  },
};
